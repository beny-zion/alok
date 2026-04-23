import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { createOrUpdateContact } from "@/lib/smoove";
import { normalizePhone } from "@/lib/phone";
import { buildCandidateFilter } from "@/lib/candidate-filter";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const filter = buildCandidateFilter(searchParams);

    const [candidates, total] = await Promise.all([
      Candidate.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Candidate.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        candidates,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Candidates list error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.firstName && !body.lastName && !body.fullName) {
      return NextResponse.json(
        { success: false, error: "יש להזין לפחות שם פרטי, שם משפחה או שם מלא" },
        { status: 400 }
      );
    }

    if (body.email) {
      const existing = await Candidate.findOne({ email: body.email });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "מועמד עם אימייל זה כבר קיים במערכת" },
          { status: 409 }
        );
      }
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value === "" || value === undefined || value === null) continue;
      cleaned[key] = value;
    }
    for (const key of ["hasWorkExperience", "hasTraining"] as const) {
      if (body[key] === false) cleaned[key] = false;
    }

    if (typeof cleaned.phone === "string") {
      const norm = normalizePhone(cleaned.phone);
      if (norm) cleaned.phone = norm;
    }

    cleaned.noEmail = !cleaned.email;

    const candidate = await Candidate.create({
      ...cleaned,
      rawPayload: {},
      source: "manual",
    });

    if (candidate.email) {
      createOrUpdateContact({
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        cellPhone: candidate.phone,
      })
        .then((res) => {
          if (res.success) {
            const contactId =
              res.data && typeof res.data === "object"
                ? (res.data as Record<string, unknown>).contactId
                : undefined;
            Candidate.findByIdAndUpdate(candidate._id, {
              smooveSynced: true,
              smooveSyncedAt: new Date(),
              smooveError: null,
              ...(contactId ? { smooveContactId: contactId } : {}),
            }).exec();
          } else {
            Candidate.findByIdAndUpdate(candidate._id, {
              smooveSynced: false,
              smooveError: res.error,
            }).exec();
          }
        })
        .catch((err) => {
          console.error("Smoove sync failed for manual candidate:", candidate.email, err);
          Candidate.findByIdAndUpdate(candidate._id, {
            smooveSynced: false,
            smooveError: String(err),
          }).exec();
        });
    }

    return NextResponse.json({ success: true, data: candidate }, { status: 201 });
  } catch (error) {
    console.error("Candidate create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
