import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";
import { JobSubmission } from "@/models/job-submission.model";
import { jobFormSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const job = await JobListing.findById(id).lean();
    if (!job) {
      return NextResponse.json(
        { success: false, error: "משרה לא נמצאה" },
        { status: 404 }
      );
    }

    const submissions = await JobSubmission.find({ jobListingId: id })
      .populate("candidateId", "firstName lastName fullName phone email cvUrl city sectors")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { ...job, submissions },
    });
  } catch (error) {
    console.error("Job get error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const parsed = jobFormSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
        { status: 400 }
      );
    }

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v === "" || v === undefined || v === null) continue;
      cleaned[k] = v;
    }
    if (typeof body.urgent === "boolean") cleaned.urgent = body.urgent;
    if (typeof body.publicVisible === "boolean") cleaned.publicVisible = body.publicVisible;

    if (typeof cleaned.salary === "string") {
      const n = Number(cleaned.salary);
      cleaned.salary = Number.isNaN(n) ? undefined : n;
    }

    if (cleaned.jobNumber) {
      const dup = await JobListing.findOne({
        jobNumber: cleaned.jobNumber,
        _id: { $ne: id },
      });
      if (dup) {
        return NextResponse.json(
          { success: false, error: "מספר משרה זה כבר בשימוש" },
          { status: 409 }
        );
      }
    }

    const job = await JobListing.findByIdAndUpdate(
      id,
      { $set: cleaned },
      { new: true, runValidators: true }
    );
    if (!job) {
      return NextResponse.json(
        { success: false, error: "משרה לא נמצאה" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deleted = await JobListing.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "משרה לא נמצאה" },
        { status: 404 }
      );
    }
    await JobSubmission.deleteMany({ jobListingId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
