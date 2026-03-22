import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

const FIELD_MAP = {
  name: "companyName",
  field_7e1d48a: "sector",
  field_7871574: "contactName",
  field_ad3e3ae: "contactPhone",
  field_a487cc7: "contactEmail",
  field_34ba21a: "type",
} as const;

function parseEmployerPayload(body: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const fieldName = FIELD_MAP[key as keyof typeof FIELD_MAP];
    if (fieldName) {
      mapped[fieldName] = value;
    }
  }

  // Parse work days if comma-separated
  if (typeof body.workDays === "string") {
    mapped.workDays = body.workDays.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  if (body.salary) mapped.salary = Number(body.salary) || undefined;

  return mapped;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseEmployerPayload(body);

    if (!parsed.companyName || !parsed.sector) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: companyName, sector" },
        { status: 400 }
      );
    }

    await connectDB();

    const jobListing = await JobListing.create({
      ...parsed,
      rawPayload: body,
      source: "elementor-webhook",
    });

    return NextResponse.json(
      { success: true, data: { id: jobListing._id } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook employer error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
