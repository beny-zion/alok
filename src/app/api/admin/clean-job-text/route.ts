import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

const ADMIN_TOKEN = process.env.ADMIN_IMPORT_TOKEN || "";

function cleanText(input: string): string {
  let s = input.replace(/<[^>]+>/g, "");
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

// One-shot endpoint: walks all JobListings and decodes HTML entities in
// title / description / companyName so the data in MongoDB is normalized
// (not just the display layer). Safe to run multiple times — idempotent.
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
    const cursor = JobListing.find({}).cursor();
    let scanned = 0;
    let updated = 0;

    for await (const job of cursor) {
      scanned++;
      const fields: Record<string, string> = {};
      if (job.title) {
        const t = cleanText(job.title);
        if (t !== job.title) fields.title = t;
      }
      if (job.description) {
        const d = cleanText(job.description);
        if (d !== job.description) fields.description = d;
      }
      if (job.companyName) {
        const c = cleanText(job.companyName);
        if (c !== job.companyName) fields.companyName = c;
      }
      if (Object.keys(fields).length > 0) {
        await JobListing.updateOne({ _id: job._id }, { $set: fields });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { scanned, updated },
    });
  } catch (error) {
    console.error("Clean job text error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
