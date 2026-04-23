import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { bulkImportContacts } from "@/lib/smoove";

export const maxDuration = 60;

// GET — how many candidates still need Smoove sync
export async function GET() {
  try {
    await connectDB();
    const pending = await Candidate.countDocuments({
      email: { $exists: true, $ne: "" },
      smooveSynced: { $ne: true },
    });
    return NextResponse.json({ success: true, data: { pending } });
  } catch (error) {
    console.error("[sync-smoove GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST — push pending candidates to Smoove. Stops on limit-hit.
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const max = Math.min(Number(body?.max) || 500, 500);

    const pending = await Candidate.find({
      email: { $exists: true, $ne: "" },
      smooveSynced: { $ne: true },
    })
      .limit(max)
      .lean();

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        data: { attempted: 0, synced: 0, failed: 0, limitHit: false },
      });
    }

    const defaultListId = process.env.SMOOVE_DEFAULT_LIST_ID
      ? Number(process.env.SMOOVE_DEFAULT_LIST_ID)
      : undefined;

    let synced = 0;
    let failed = 0;
    let limitHit = false;
    let errorMsg: string | undefined;

    for (let i = 0; i < pending.length; i += 100) {
      const batch = pending.slice(i, i + 100);
      const contacts = batch.map((c) => ({
        email: c.email!,
        firstName: c.firstName,
        lastName: c.lastName,
        cellPhone: c.phone,
      }));
      const result = await bulkImportContacts(contacts, defaultListId);
      if (result.success) {
        synced += batch.length;
        await Candidate.updateMany(
          { _id: { $in: batch.map((c) => c._id) } },
          { $set: { smooveSynced: true, smooveSyncedAt: new Date(), smooveError: undefined } }
        );
      } else {
        failed += batch.length;
        errorMsg = result.error;
        await Candidate.updateMany(
          { _id: { $in: batch.map((c) => c._id) } },
          { $set: { smooveSynced: false, smooveError: result.error } }
        );
        if (result.limitExceeded) {
          limitHit = true;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { attempted: pending.length, synced, failed, limitHit, error: errorMsg },
    });
  } catch (error) {
    console.error("[sync-smoove POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
