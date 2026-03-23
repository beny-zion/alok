import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";
import { createOrUpdateContact } from "@/lib/smoove";

// Field mapping based on actual Elementor employer form data
// Keys are Hebrew labels or "אין תווית FIELD_ID" patterns
const FIELD_MAP: Record<string, string> = {
  "אין תווית name": "companyName",
  "אין תווית field_7ac6cda": "companyPhone",
  "אין תווית field_7e1d48a": "sector",
  "אזור העבודה:": "workArea",
  "סוג משרה:": "jobPermanence",
  "שכר:": "salary",
  "ימי עבודה:": "workDays",
  "שעות עבודה/סוג משמרת:": "workHours",
  "אין תווית field_7871574": "contactName",
  "אין תווית field_3382a5d": "contactLastName",
  "אין תווית field_dc026e3": "contactGender",
  "אין תווית field_ad3e3ae": "contactPhone",
  "אין תווית field_a487cc7": "contactEmail",
  "אין תווית field_34ba21a": "type",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function mapToJobListing(body: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const fieldName = FIELD_MAP[key];
    if (fieldName && value) {
      mapped[fieldName] = value.trim();
    }
  }

  // Parse salary as number
  if (mapped.salary) mapped.salary = Number(mapped.salary) || undefined;

  // Parse workDays comma-separated to array
  if (typeof mapped.workDays === "string") {
    mapped.workDays = mapped.workDays.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  return mapped;
}

export async function GET() {
  return NextResponse.json(
    { status: "ok", endpoint: "employer webhook" },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    // Parse URL-encoded body (flat Hebrew keys)
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      body[key] = value;
    }

    const parsed = mapToJobListing(body);
    console.log("Employer mapped:", JSON.stringify(parsed).slice(0, 1000));

    if (!parsed.companyName) {
      console.error("Missing companyName. Keys:", Object.keys(body));
      return NextResponse.json(
        { success: true },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    await connectDB();

    const jobListing = await JobListing.create({
      ...parsed,
      rawPayload: body,
      source: "elementor-webhook",
    });
    console.log("Job listing saved:", jobListing._id);

    // Sync employer contact to Smoove - fire and forget
    if (parsed.contactEmail) {
      createOrUpdateContact({
        email: parsed.contactEmail as string,
        firstName: (parsed.contactName as string) || undefined,
        lastName: (parsed.contactLastName as string) || undefined,
        cellPhone: (parsed.contactPhone as string) || undefined,
      })
        .then((res) => console.log("Smoove employer sync:", res.success ? "ok" : res.error))
        .catch((err) => console.error("Smoove employer sync failed:", err));
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Webhook employer error:", error);
    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}
