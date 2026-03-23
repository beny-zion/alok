import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { createOrUpdateContact } from "@/lib/smoove";

// Corrected field ID mapping based on actual Elementor webhook data
const FIELD_MAP: Record<string, string> = {
  name: "firstName",
  field_9b4b058: "lastName",
  field_55a80fb: "age",
  field_0271f15: "city",
  field_5b06785: "address",
  field_8331320: "phone",
  field_6c16bcf: "email",
  field_7e1d48a: "gender",
  jobscontainer: "sectors",
  mytext: "freeText",
  field_46111c1: "jobType",
  field_df823a4: "jobPermanence",
  field_b2c9d05: "salaryExpectation",
  field_7871574: "hasWorkExperience",
  field_1b96d15: "workExperienceDetails",
  field_4a14834: "hasTraining",
  field_e26a080: "trainingDetails",
  field_f8db0be: "motherTongue",
  field_85b2b5c: "additionalLanguages",
  field_c4db162: "additionalLanguagesText",
  field_a8e8524: "additionalInfo",
  field_fa08cf2: "additionalNotes",
  field_6715ccd: "jobListingNumber",
  field_47496c0: "cvUrl",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Parse Elementor's bracket-notation URL-encoded data
// e.g. "fields[name][value]" = "בני" → { name: "בני" }
function extractFieldsFromBracketNotation(body: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    // Match pattern: fields[FIELD_ID][value]
    const match = key.match(/^fields\[([^\]]+)\]\[value\]$/);
    if (match) {
      const fieldId = match[1];
      fields[fieldId] = String(value ?? "");
    }
  }

  return fields;
}

function mapToCandidate(fields: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const fieldName = FIELD_MAP[key];
    if (fieldName && value) {
      mapped[fieldName] = typeof value === "string" ? value.trim() : value;
    }
  }

  // Parse sectors (comma-separated from checkbox)
  if (typeof mapped.sectors === "string") {
    mapped.sectors = mapped.sectors.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  // Parse additional languages (comma-separated from checkbox)
  if (typeof mapped.additionalLanguages === "string") {
    mapped.additionalLanguages = mapped.additionalLanguages.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  // Parse motherTongue (comma-separated from checkbox, take first)
  if (typeof mapped.motherTongue === "string") {
    mapped.motherTongue = mapped.motherTongue.split(",")[0]?.trim() || mapped.motherTongue;
  }

  // Parse hasWorkExperience / hasTraining checkbox to boolean
  if (mapped.hasWorkExperience) {
    mapped.hasWorkExperience = String(mapped.hasWorkExperience).includes("כן");
  }
  if (mapped.hasTraining) {
    mapped.hasTraining = String(mapped.hasTraining).includes("כן");
  }

  // Parse numbers
  if (mapped.age) mapped.age = Number(mapped.age) || undefined;
  if (mapped.salaryExpectation) mapped.salaryExpectation = Number(mapped.salaryExpectation) || undefined;
  if (mapped.jobListingNumber) mapped.jobListingNumber = Number(mapped.jobListingNumber) || undefined;

  return mapped;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    // Parse URL-encoded body
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      body[key] = value;
    }

    // Extract field values from bracket notation
    const fields = extractFieldsFromBracketNotation(body);
    const parsed = mapToCandidate(fields);

    if (!parsed.email || !parsed.firstName) {
      console.error("Missing required fields. Parsed:", parsed);
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Save to MongoDB
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
    console.log("Candidate saved:", candidate.email);

    // Smoove sync - fire and forget, don't delay response
    createOrUpdateContact({
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      cellPhone: candidate.phone,
    })
      .then((res) => {
        if (res.success && res.data) {
          const contactId = (res.data as Record<string, unknown>)?.contactId;
          if (contactId) {
            Candidate.findByIdAndUpdate(candidate._id, { smooveContactId: contactId }).exec();
          }
        }
      })
      .catch(() => console.error("Smoove sync failed:", candidate.email));

    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Webhook candidate error:", error);
    // Always return 200 to Elementor so it doesn't show error to user
    return NextResponse.json(
      { success: false, error: "Internal error logged" },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}
