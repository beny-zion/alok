import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Campaign } from "@/models/campaign.model";
import { Candidate } from "@/models/candidate.model";
import { bulkImportContacts, createCampaign } from "@/lib/smoove";

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
    const candidates = await Candidate.find({ _id: { $in: candidateIds } }).lean();

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

    // Sync candidates to Smoove
    const contacts = candidates.map((c) => ({
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      cellPhone: c.phone,
    }));

    // Bulk import in batches of 500
    for (let i = 0; i < contacts.length; i += 500) {
      const batch = contacts.slice(i, i + 500);
      await bulkImportContacts(batch);
    }

    // Create and send campaign via Smoove
    const smooveResult = await createCampaign({
      subject,
      body: htmlContent,
      listIds: [], // Will use default list — to be configured
      sendNow: true,
    });

    if (smooveResult.success) {
      const campaignId = (smooveResult.data as Record<string, unknown>)?.id;
      await Campaign.findByIdAndUpdate(campaign._id, {
        status: "sent",
        smooveCampaignId: campaignId ? Number(campaignId) : undefined,
      });
    } else {
      await Campaign.findByIdAndUpdate(campaign._id, {
        status: "failed",
        errorMessage: smooveResult.error,
      });
    }

    const updatedCampaign = await Campaign.findById(campaign._id).lean();

    return NextResponse.json(
      { success: true, data: updatedCampaign },
      { status: 201 }
    );
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
