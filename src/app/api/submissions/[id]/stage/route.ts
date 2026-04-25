import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobSubmission } from "@/models/job-submission.model";
import { submissionStageSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const parsed = submissionStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
        { status: 400 }
      );
    }

    const submission = await JobSubmission.findById(id);
    if (!submission) {
      return NextResponse.json(
        { success: false, error: "ההפניה לא נמצאה" },
        { status: 404 }
      );
    }

    submission.stage = parsed.data.stage;
    if (parsed.data.notes !== undefined) submission.notes = parsed.data.notes;
    if (parsed.data.rejectionReason !== undefined)
      submission.rejectionReason = parsed.data.rejectionReason;

    await submission.save();

    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("Submission stage error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
