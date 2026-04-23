import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { createOrUpdateContact, updateContactById } from "@/lib/smoove";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (!candidate.email) {
      return NextResponse.json(
        { success: false, error: "אין אימייל למועמד זה — לא ניתן לסנכרן ל-Smoove" },
        { status: 400 }
      );
    }

    const payload = {
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      cellPhone: candidate.phone,
    };

    let res = candidate.smooveContactId
      ? await updateContactById(candidate.smooveContactId, payload)
      : await createOrUpdateContact(payload);

    if (!res.success && candidate.smooveContactId && /not.?found|404/i.test(res.error || "")) {
      res = await createOrUpdateContact(payload);
    }

    if (res.success) {
      const contactId =
        res.data && typeof res.data === "object"
          ? (res.data as Record<string, unknown>).contactId
          : undefined;
      await Candidate.findByIdAndUpdate(id, {
        smooveSynced: true,
        smooveSyncedAt: new Date(),
        smooveError: null,
        ...(contactId ? { smooveContactId: contactId } : {}),
      });
      return NextResponse.json({ success: true, data: { smooveContactId: contactId ?? candidate.smooveContactId } });
    }

    await Candidate.findByIdAndUpdate(id, {
      smooveSynced: false,
      smooveError: res.error,
    });
    return NextResponse.json(
      { success: false, error: res.error || "סנכרון נכשל", limitExceeded: res.limitExceeded },
      { status: res.limitExceeded ? 402 : 500 }
    );
  } catch (error) {
    console.error("Single Smoove sync error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
