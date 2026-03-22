import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { createOrUpdateContact } from "@/lib/smoove";

// Field ID mapping from Elementor form
const FIELD_MAP: Record<string, string> = {
  name: "firstName",
  field_9b4b058: "lastName",
  field_55a80fb: "age",
  field_0271f15: "city",
  field_5b06785: "address",
  field_8331320: "phone",
  field_6c16bcf: "email",
  field_7e1d48a: "gender",
  field_760e340: "sectors",
  mytext: "freeText",
  field_46111c1: "jobType",
  field_df823a4: "jobPermanence",
  field_b2c9d05: "salaryExpectation",
  field_0ac03f5: "workExperience",
  field_bf77361: "motherTongue",
  field_c4db162: "additionalLanguages",
  field_a8e8524: "additionalInfo",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function parseBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";

  // Try JSON first
  if (contentType.includes("application/json")) {
    return request.json();
  }

  // Handle form-urlencoded
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const result: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  // Handle multipart/form-data
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const result: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      result[key] = typeof value === "string" ? value : value.name;
    }
    return result;
  }

  // Fallback: try JSON, then text
  try {
    return await request.json();
  } catch {
    const text = await request.text();
    try {
      return JSON.parse(text);
    } catch {
      // Try as URL-encoded
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

  // Elementor nested format: { fields: { name: { id, value, type }, ... } }
  // or { fields: { name: "value", ... } }
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

  // Flat format: { name: "value", field_xxx: "value" }
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string" || typeof value === "number") {
      flat[key] = String(value);
    }
  }

  return flat;
}

function mapToCandidate(fields: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const fieldName = FIELD_MAP[key];
    if (fieldName && value) {
      mapped[fieldName] = value;
    }
  }

  // Parse sectors (comma-separated string to array)
  if (typeof mapped.sectors === "string") {
    mapped.sectors = mapped.sectors.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  // Parse additional languages
  if (typeof mapped.additionalLanguages === "string") {
    mapped.additionalLanguages = mapped.additionalLanguages
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  // Parse age and salary as numbers
  if (mapped.age) mapped.age = Number(mapped.age) || undefined;
  if (mapped.salaryExpectation) mapped.salaryExpectation = Number(mapped.salaryExpectation) || undefined;

  return mapped;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

// DEBUG MODE - temporarily log raw data and always return 200
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);

    console.log("=== RAW WEBHOOK DATA FROM ELEMENTOR ===");
    console.log(JSON.stringify(body, null, 2));
    console.log("=======================================");

    return NextResponse.json(
      { success: true, message: "Debug mode: Data received successfully", rawData: body },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Webhook debug error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/* ORIGINAL POST - restore after debug
export async function POST_ORIGINAL(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const fields = extractFields(body);
    const parsed = mapToCandidate(fields);

    if (!parsed.email || !parsed.firstName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, firstName", receivedKeys: Object.keys(body) },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await connectDB();

    const candidate = await Candidate.findOneAndUpdate(
      { email: parsed.email },
      {
        ...parsed,
        rawPayload: body,
        source: "elementor-webhook",
      },
      { upsert: true, new: true, runValidators: true }
    );

    try {
      const smooveResult = await createOrUpdateContact({
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        cellPhone: candidate.phone,
      });

      if (smooveResult.success && smooveResult.data) {
        const contactId = (smooveResult.data as Record<string, unknown>)?.contactId;
        if (contactId) {
          await Candidate.findByIdAndUpdate(candidate._id, { smooveContactId: contactId });
        }
      }
    } catch {
      console.error("Smoove sync failed for candidate:", candidate.email);
    }

    return NextResponse.json(
      { success: true, data: { id: candidate._id } },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate email" },
        { status: 409, headers: CORS_HEADERS }
      );
    }
    console.error("Webhook candidate error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
*/
