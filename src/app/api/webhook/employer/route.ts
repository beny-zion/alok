import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JobListing } from "@/models/job-listing.model";

const FIELD_MAP: Record<string, string> = {
  name: "companyName",
  field_7e1d48a: "sector",
  field_7871574: "contactName",
  field_ad3e3ae: "contactPhone",
  field_a487cc7: "contactEmail",
  field_34ba21a: "type",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function parseBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const result: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const result: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      result[key] = typeof value === "string" ? value : value.name;
    }
    return result;
  }

  try {
    return await request.json();
  } catch {
    const text = await request.text();
    try {
      return JSON.parse(text);
    } catch {
      const params = new URLSearchParams(text);
      const result: Record<string, unknown> = {};
      for (const [key, value] of params.entries()) {
        result[key] = value;
      }
      return result;
    }
  }
}

function extractFields(body: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};

  if (body.fields && typeof body.fields === "object") {
    const fields = body.fields as Record<string, unknown>;
    for (const [key, val] of Object.entries(fields)) {
      if (val && typeof val === "object" && "value" in (val as Record<string, unknown>)) {
        const fieldVal = (val as Record<string, unknown>).value;
        const fieldId = (val as Record<string, unknown>).id as string || key;
        flat[fieldId] = String(fieldVal ?? "");
      } else {
        flat[key] = String(val ?? "");
      }
    }
    return flat;
  }

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string" || typeof value === "number") {
      flat[key] = String(value);
    }
  }

  return flat;
}

function mapToJobListing(fields: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const fieldName = FIELD_MAP[key];
    if (fieldName && value) {
      mapped[fieldName] = value;
    }
  }

  if (mapped.salary) mapped.salary = Number(mapped.salary) || undefined;

  return mapped;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

// DEBUG MODE - log raw Elementor data and return 200
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      body[key] = value;
    }

    console.log("=== RAW EMPLOYER WEBHOOK DATA ===");
    console.log(JSON.stringify(body, null, 2));
    console.log("=================================");

    return NextResponse.json(
      { success: true, message: "Debug: employer data received" },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Employer webhook debug error:", error);
    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}
