import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobSubmission } from "@/models/job-submission.model";
import { JobListing } from "@/models/job-listing.model";
import { Types } from "mongoose";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const submissions = await JobSubmission.find({ jobListingId: id })
      .populate("candidateId", "firstName lastName fullName phone email cvUrl city sectors")
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    console.error("Submissions list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const candidateIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds : [];
    if (candidateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "לא נבחרו מועמדים" },
        { status: 400 }
      );
    }

    const job = await JobListing.findById(id).select("_id");
    if (!job) {
      return NextResponse.json(
        { success: false, error: "משרה לא נמצאה" },
        { status: 404 }
      );
    }

    const validIds = candidateIds.filter((cid) => Types.ObjectId.isValid(cid));
    const ops = validIds.map((cid) => ({
      updateOne: {
        filter: { candidateId: cid, jobListingId: id },
        update: {
          $setOnInsert: {
            candidateId: cid,
            jobListingId: id,
            stage: "proposed",
            proposedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));
    if (ops.length === 0) {
      return NextResponse.json(
        { success: false, error: "מזהי מועמדים לא תקינים" },
        { status: 400 }
      );
    }

    const result = await JobSubmission.bulkWrite(ops);
    return NextResponse.json({
      success: true,
      data: {
        added: result.upsertedCount ?? 0,
        existed: validIds.length - (result.upsertedCount ?? 0),
      },
    });
  } catch (error) {
    console.error("Submissions add error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
