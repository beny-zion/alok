import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

// One-shot admin endpoint to import all jobs from WordPress into the CRM.
// Protected by a token so it can't be triggered casually. Delete after use.

const WP_BASE_URL = process.env.WP_BASE_URL || "https://alok.co.il";
const ADMIN_TOKEN = process.env.ADMIN_IMPORT_TOKEN || "";

interface WpTerm { id: number; name: string; taxonomy: string }
interface WpJob {
  id: number;
  slug: string;
  status: string;
  title: { rendered: string };
  meta?: Record<string, unknown>;
  _embedded?: { "wp:term"?: WpTerm[][] };
}

function pickTerm(job: WpJob, taxonomy: string): string | undefined {
  const groups = job._embedded?.["wp:term"] || [];
  for (const group of groups) {
    for (const term of group) {
      if (term.taxonomy === taxonomy) return term.name;
    }
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-admin-token") || "";
  if (!ADMIN_TOKEN || auth !== ADMIN_TOKEN) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const res = await fetch(
      `${WP_BASE_URL}/wp-json/wp/v2/jobs?per_page=100&_embed=wp:term&status=publish`
    );
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `WP fetch failed: ${res.status}` },
        { status: 500 }
      );
    }
    const wpJobs: WpJob[] = await res.json();

    const log: string[] = [];
    let created = 0;
    let skipped = 0;

    for (const wp of wpJobs) {
      const title = wp.title.rendered.replace(/&#8217;/g, "'").replace(/&amp;/g, "&");
      const existing = await JobListing.findOne({ title });
      if (existing) {
        log.push(`SKIP "${title}"`);
        skipped++;
        continue;
      }

      const meta = (wp.meta ?? {}) as Record<string, unknown>;
      await JobListing.create({
        title,
        description: typeof meta.info_job === "string" ? meta.info_job : "",
        jobNumber: typeof meta.job_number === "string" ? meta.job_number : undefined,
        sector: pickTerm(wp, "job_category"),
        workArea: pickTerm(wp, "job_place"),
        jobPermanence: pickTerm(wp, "job-scope"),
        companyName: "—",
        status: "open",
        publicVisible: true,
        urgent: false,
        placementsCount: 0,
        paymentSchedule: "two-installments",
        firstPaymentDays: 90,
        source: "wordpress-import",
        rawPayload: { wp_id: wp.id, wp_slug: wp.slug, imported_at: new Date().toISOString() },
      });
      log.push(`CREATED "${title}"`);
      created++;
    }

    return NextResponse.json({
      success: true,
      data: { totalInWp: wpJobs.length, created, skipped, log },
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
