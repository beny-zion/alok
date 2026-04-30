import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Campaign } from "@/models/campaign.model";
import { Candidate, ICandidate } from "@/models/candidate.model";
import { bulkImportContacts, createCampaign } from "@/lib/smoove";
import { wrapInBrandedTemplate } from "@/lib/email-template";

// Replace merge tags like {{firstName}} with actual candidate data
function replaceMergeTags(html: string, candidate: ICandidate): string {
  return html
    .replace(/\{\{firstName\}\}/g, candidate.firstName || "")
    .replace(/\{\{lastName\}\}/g, candidate.lastName || "")
    .replace(/\{\{city\}\}/g, candidate.city || "")
    .replace(/\{\{sectors\}\}/g, (candidate.sectors || []).join(", "));
}

export async function GET() {
  try {
    await connectDB();
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Campaigns list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { subject, htmlContent, candidateIds, filters } = await request.json();

    if (!subject || !htmlContent || !candidateIds?.length) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: subject, htmlContent, candidateIds" },
        { status: 400 }
      );
    }

    // Fetch selected candidates
    const candidates = await Candidate.find({ _id: { $in: candidateIds } }).lean() as unknown as ICandidate[];

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid candidates found" },
        { status: 400 }
      );
    }

    // Create campaign record in MongoDB
    const campaign = await Campaign.create({
      subject,
      htmlContent,
      candidateIds,
      recipientCount: candidates.length,
      filters,
      status: "draft",
    });

    // Sync candidates to Smoove — skip any without email (cannot receive campaign)
    const skippedNoEmail = candidates.filter((c) => !c.email?.trim()).length;
    const contacts = candidates
      .filter((c) => c.email?.trim())
      .map((c) => ({
        email: c.email!.trim(),
        firstName: c.firstName?.trim(),
        lastName: c.lastName?.trim(),
        cellPhone: c.phone?.trim(),
      }));

    if (contacts.length === 0) {
      await Campaign.findByIdAndUpdate(campaign._id, {
        status: "failed",
        errorMessage: "לא נבחרו מועמדים עם כתובת מייל",
      });
      return NextResponse.json(
        { success: false, error: "לא נבחרו מועמדים עם כתובת מייל" },
        { status: 400 }
      );
    }

    // Use configured default list ID
    const defaultListId = process.env.SMOOVE_DEFAULT_LIST_ID
      ? Number(process.env.SMOOVE_DEFAULT_LIST_ID)
      : undefined;

    console.log("[Campaign] Using Smoove list ID:", defaultListId);

    if (!defaultListId) {
      console.error("[Campaign] SMOOVE_DEFAULT_LIST_ID not configured!");
      await Campaign.findByIdAndUpdate(campaign._id, {
        status: "failed",
        errorMessage: "SMOOVE_DEFAULT_LIST_ID not configured",
      });
      return NextResponse.json(
        { success: false, error: "שגיאת הגדרות: חסר List ID של Smoove" },
        { status: 500 }
      );
    }

    // Bulk import in batches of 500 — add contacts to the campaign list
    for (let i = 0; i < contacts.length; i += 500) {
      const batch = contacts.slice(i, i + 500);
      const importResult = await bulkImportContacts(batch, defaultListId);
      console.log("[Campaign] Bulk import result:", JSON.stringify(importResult));

      if (!importResult.success) {
        const errMsg = `Bulk import failed: ${importResult.error}`;
        console.error("[Campaign]", errMsg);
        await Campaign.findByIdAndUpdate(campaign._id, {
          status: "failed",
          errorMessage: errMsg,
        });
        return NextResponse.json(
          { success: false, error: "שגיאה בייבוא אנשי קשר ל-Smoove" },
          { status: 502 }
        );
      }
    }

    // Wrap content in branded email template
    const logoUrl = "https://alok.co.il/wp-content/uploads/2026/01/לוגו-AL-גיוס-עובדים-והשמה-2.png";
    const brandedHtml = wrapInBrandedTemplate(htmlContent, { logoUrl });

    // Replace merge tags — Smoove uses [[Field Name]] syntax (double brackets)
    const hasMergeTags = /\{\{(firstName|lastName|city|sectors)\}\}/.test(brandedHtml + subject);

    const smooveHtml = hasMergeTags
      ? brandedHtml
          .replace(/\{\{firstName\}\}/g, "[[First Name]]")
          .replace(/\{\{lastName\}\}/g, "[[Last Name]]")
          .replace(/\{\{city\}\}/g, "[[City]]")
          .replace(/\{\{sectors\}\}/g, "[[Sectors]]")
      : brandedHtml;

    const smooveSubject = hasMergeTags
      ? subject
          .replace(/\{\{firstName\}\}/g, "[[First Name]]")
          .replace(/\{\{lastName\}\}/g, "[[Last Name]]")
      : subject;

    // Send only to the selected candidates — not the entire list
    const recipientEmails = contacts.map((c) => c.email).filter(Boolean) as string[];
    console.log("[Campaign] Sending to Smoove — subject:", smooveSubject, "recipients:", recipientEmails.length);

    const smooveResult = await createCampaign({
      subject: smooveSubject,
      body: smooveHtml,
      recipientEmails,
      sendNow: true,
    });

    console.log("[Campaign] Smoove result:", JSON.stringify(smooveResult));

    if (smooveResult.success) {
      const campaignId = (smooveResult.data as Record<string, unknown>)?.id;
      await Campaign.findByIdAndUpdate(campaign._id, {
        status: "sent",
        smooveCampaignId: campaignId ? Number(campaignId) : undefined,
      });

      const updatedCampaign = await Campaign.findById(campaign._id).lean();
      return NextResponse.json(
        { success: true, data: updatedCampaign, skippedNoEmail },
        { status: 201 }
      );
    } else {
      const errorMsg = smooveResult.error || "Smoove campaign creation failed";
      console.error("[Campaign] Smoove failed:", errorMsg);

      await Campaign.findByIdAndUpdate(campaign._id, {
        status: "failed",
        errorMessage: errorMsg,
      });

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
