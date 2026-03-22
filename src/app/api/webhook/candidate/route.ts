import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { createOrUpdateContact } from "@/lib/smoove";

// Field ID mapping from Elementor form
const FIELD_MAP = {
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
} as const;

function parseWebhookPayload(body: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const fieldName = FIELD_MAP[key as keyof typeof FIELD_MAP];
    if (fieldName) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseWebhookPayload(body);

    if (!parsed.email || !parsed.firstName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, firstName" },
        { status: 400 }
      );
    }

    await connectDB();

    // Upsert: update if email exists, create if not
    const candidate = await Candidate.findOneAndUpdate(
      { email: parsed.email },
      {
        ...parsed,
        rawPayload: body,
        source: "elementor-webhook",
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Sync to Smoove
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
      // Don't fail the webhook if Smoove sync fails
      console.error("Smoove sync failed for candidate:", candidate.email);
    }

    return NextResponse.json(
      { success: true, data: { id: candidate._id } },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate email" },
        { status: 409 }
      );
    }
    console.error("Webhook candidate error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
