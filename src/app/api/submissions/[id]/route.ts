import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobSubmission } from "@/models/job-submission.model";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deleted = await JobSubmission.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "ההפניה לא נמצאה" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submission delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
