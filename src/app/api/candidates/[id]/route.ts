import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import {
  createOrUpdateContact,
  unsubscribeContact,
  updateContactById,
} from "@/lib/smoove";
import { normalizePhone } from "@/lib/phone";
import {
  deleteWordPressMedia,
  findMediaIdByUrl,
  isWordPressMediaUrl,
} from "@/lib/wordpress-cv";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const candidate = await Candidate.findById(id).lean();

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Candidate get error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Check email uniqueness if email changed
    if (body.email) {
      const existing = await Candidate.findOne({
        email: body.email,
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "מועמד אחר עם אימייל זה כבר קיים במערכת" },
          { status: 409 }
        );
      }
    }

    // Strip empty strings so Mongoose uses schema defaults.
    // Keep `false` booleans though — they're meaningful for hasWorkExperience/hasTraining.
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value === "" || value === undefined || value === null) continue;
      cleaned[key] = value;
    }

    // Also preserve explicit `false` booleans
    for (const key of ["hasWorkExperience", "hasTraining"] as const) {
      if (body[key] === false) cleaned[key] = false;
    }

    if (typeof cleaned.phone === "string") {
      const norm = normalizePhone(cleaned.phone);
      if (norm) cleaned.phone = norm;
    }

    const prev = await Candidate.findById(id);
    if (!prev) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const emailWasAdded = !prev.email && cleaned.email;
    if (emailWasAdded) {
      cleaned.smooveSynced = false;
    }
    cleaned.noEmail = !(cleaned.email ?? prev.email);

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: cleaned },
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Decide whether to push to Smoove and which flow to use.
    // Only sync when a core contact field actually changed, and only if we have an email.
    const coreChanged =
      prev.email !== candidate.email ||
      prev.firstName !== candidate.firstName ||
      prev.lastName !== candidate.lastName ||
      prev.phone !== candidate.phone;

    if (candidate.email && coreChanged) {
      const payload = {
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        cellPhone: candidate.phone,
      };

      const syncPromise = prev.smooveContactId
        ? updateContactById(prev.smooveContactId, payload).then(async (res) => {
            // If Smoove says the contact no longer exists, fall back to upsert.
            if (!res.success && /not.?found|404/i.test(res.error || "")) {
              return createOrUpdateContact(payload);
            }
            return res;
          })
        : createOrUpdateContact(payload);

      syncPromise
        .then((res) => {
          if (res.success) {
            const contactId =
              res.data && typeof res.data === "object"
                ? (res.data as Record<string, unknown>).contactId
                : undefined;
            Candidate.findByIdAndUpdate(id, {
              smooveSynced: true,
              smooveSyncedAt: new Date(),
              smooveError: null,
              ...(contactId ? { smooveContactId: contactId } : {}),
            }).exec();
          } else {
            Candidate.findByIdAndUpdate(id, {
              smooveSynced: false,
              smooveError: res.error,
            }).exec();
          }
        })
        .catch((err) => {
          console.error("Smoove sync failed for updated candidate:", candidate.email, err);
          Candidate.findByIdAndUpdate(id, {
            smooveSynced: false,
            smooveError: String(err),
          }).exec();
        });
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Candidate update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deleted = await Candidate.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (deleted.smooveContactId) {
      unsubscribeContact(deleted.smooveContactId).catch((err) =>
        console.error("Smoove unsubscribe failed for deleted candidate:", deleted.email, err)
      );
    }

    // Best-effort cleanup of the candidate's CV file in WordPress media.
    // Only delete URLs hosted on our WP install — legacy Elementor uploads
    // on a different domain are left alone.
    if (deleted.cvUrl && isWordPressMediaUrl(deleted.cvUrl)) {
      findMediaIdByUrl(deleted.cvUrl)
        .then((mediaId) => {
          if (mediaId) {
            return deleteWordPressMedia(mediaId);
          }
        })
        .catch((err) =>
          console.error("CV WP delete failed:", deleted.cvUrl, err)
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Candidate delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
