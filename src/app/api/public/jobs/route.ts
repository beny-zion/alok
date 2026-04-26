import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

function cleanText(input?: string): string | undefined {
  if (input == null) return undefined;
  let s = String(input).replace(/<[^>]+>/g, "");
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  s = s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  return s.trim();
}

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
      // Show every publicly-visible job EXCEPT drafts. "filled" and "closed" both
      // surface (the WP CSS gives them the strikethrough/FOMO treatment).
      { publicVisible: true, status: { $ne: "draft" } },
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

    // Clean HTML entities from text fields so WordPress doesn't double-escape
    // them on sync (e.g. titles like `סוכני נדל&quot;ן`).
    const cleanedJobs = jobs.map((j) => ({
      ...j,
      title: cleanText(j.title) ?? "",
      description: cleanText(j.description),
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          jobs: cleanedJobs,
          total: cleanedJobs.length,
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
