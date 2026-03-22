import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const city = searchParams.get("city");
    const sector = searchParams.get("sector");
    const search = searchParams.get("search");
    const gender = searchParams.get("gender");
    const jobType = searchParams.get("jobType");

    // Build filter
    const filter: Record<string, unknown> = {};

    if (city) filter.city = city;
    if (gender) filter.gender = gender;
    if (jobType) filter.jobType = jobType;
    if (sector) filter.sectors = { $in: [sector] };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const [candidates, total] = await Promise.all([
      Candidate.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Candidate.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        candidates,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Candidates list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
