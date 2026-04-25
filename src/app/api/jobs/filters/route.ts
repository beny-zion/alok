import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

export async function GET() {
  try {
    await connectDB();

    const [sectors, workAreas, jobPermanences, jobTypes, statuses] = await Promise.all([
      JobListing.distinct("sector").then((vals) =>
        vals.filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "he"))
      ),
      JobListing.distinct("workArea").then((vals) =>
        vals.filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "he"))
      ),
      JobListing.distinct("jobPermanence").then((vals) => vals.filter(Boolean)),
      JobListing.distinct("jobType").then((vals) => vals.filter(Boolean)),
      JobListing.distinct("status").then((vals) => vals.filter(Boolean)),
    ]);

    return NextResponse.json({
      success: true,
      data: { sectors, workAreas, jobPermanences, jobTypes, statuses },
    });
  } catch (error) {
    console.error("Job filters error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
