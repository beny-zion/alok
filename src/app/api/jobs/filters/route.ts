import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

const WP_BASE_URL = process.env.WP_BASE_URL || "https://alok.co.il";

async function fetchWpTaxonomy(slug: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${WP_BASE_URL}/wp-json/wp/v2/${slug}?per_page=100&_fields=name`,
      { next: { revalidate: 300 } } // 5 min cache
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((t: { name?: string }) => t.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
  } catch {
    return [];
  }
}

function mergeUnique(...lists: string[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const item of list) if (item) set.add(item);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
}

export async function GET() {
  try {
    await connectDB();

    const [
      dbSectors,
      dbWorkAreas,
      dbJobPermanences,
      dbJobTypes,
      dbStatuses,
      wpSectors,
      wpWorkAreas,
      wpJobScopes,
    ] = await Promise.all([
      JobListing.distinct("sector").then((vals) => vals.filter(Boolean) as string[]),
      JobListing.distinct("workArea").then((vals) => vals.filter(Boolean) as string[]),
      JobListing.distinct("jobPermanence").then((vals) => vals.filter(Boolean) as string[]),
      JobListing.distinct("jobType").then((vals) => vals.filter(Boolean) as string[]),
      JobListing.distinct("status").then((vals) => vals.filter(Boolean) as string[]),
      fetchWpTaxonomy("job_category"),
      fetchWpTaxonomy("job_place"),
      fetchWpTaxonomy("job-scope"),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sectors: mergeUnique(wpSectors, dbSectors),
        workAreas: mergeUnique(wpWorkAreas, dbWorkAreas),
        jobPermanences: mergeUnique(wpJobScopes, dbJobPermanences),
        jobTypes: dbJobTypes,
        statuses: dbStatuses,
        // Surface WP-canonical lists separately so the UI can mark new
        // free-add values that don't exist yet on WordPress.
        wpSectors,
        wpWorkAreas,
        wpJobScopes,
      },
    });
  } catch (error) {
    console.error("Job filters error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
