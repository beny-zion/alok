import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";
import { jobFormSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sector = searchParams.get("sector") || "";
    const workArea = searchParams.get("workArea") || "";
    const urgent = searchParams.get("urgent") || "";
    const publicVisible = searchParams.get("publicVisible") || "";

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { sector: { $regex: search, $options: "i" } },
        { workArea: { $regex: search, $options: "i" } },
        { jobNumber: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
      ];
    }
    if (status) filter.status = status;
    if (sector) filter.sector = sector;
    if (workArea) filter.workArea = workArea;
    if (urgent === "true") filter.urgent = true;
    if (publicVisible === "true") filter.publicVisible = true;
    if (publicVisible === "false") filter.publicVisible = false;

    const [jobs, total] = await Promise.all([
      JobListing.find(filter)
        .sort({ urgent: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      JobListing.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = jobFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
        { status: 400 }
      );
    }

    const { salary, ...rest } = parsed.data;
    const doc: Record<string, unknown> = {
      ...rest,
      source: "manual",
    };
    if (salary) {
      const n = Number(salary);
      if (!Number.isNaN(n)) doc.salary = n;
    }

    if (parsed.data.jobNumber) {
      const dup = await JobListing.findOne({ jobNumber: parsed.data.jobNumber });
      if (dup) {
        return NextResponse.json(
          { success: false, error: "מספר משרה זה כבר בשימוש" },
          { status: 409 }
        );
      }
    }

    const job = await JobListing.create(doc);
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create job" },
      { status: 500 }
    );
  }
}
