import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";

export async function GET() {
  try {
    await connectDB();

    const [cities, sectors, genders, jobTypes] = await Promise.all([
      Candidate.distinct("city").then((vals) =>
        vals.filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "he"))
      ),
      Candidate.distinct("sectors").then((vals) =>
        vals.filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, "he"))
      ),
      Candidate.distinct("gender").then((vals) => vals.filter(Boolean)),
      Candidate.distinct("jobType").then((vals) => vals.filter(Boolean)),
    ]);

    return NextResponse.json({
      success: true,
      data: { cities, sectors, genders, jobTypes },
    });
  } catch (error) {
    console.error("Filter options error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
