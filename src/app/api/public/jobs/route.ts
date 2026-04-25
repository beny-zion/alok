import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET() {
  try {
    await connectDB();

    const jobs = await JobListing.find(
      { publicVisible: true, status: { $in: ["open", "filled"] } },
      {
        title: 1,
        description: 1,
        sector: 1,
        workArea: 1,
        jobPermanence: 1,
        urgent: 1,
        status: 1,
        jobNumber: 1,
        createdAt: 1,
      }
    )
      .sort({ urgent: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          jobs,
          total: jobs.length,
          updatedAt: new Date().toISOString(),
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Public jobs feed error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch jobs" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
