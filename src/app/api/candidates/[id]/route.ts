import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { createOrUpdateContact, unsubscribeContact } from "@/lib/smoove";

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

    // Strip empty strings so Mongoose uses schema defaults
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== "" && value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }

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

    // Sync to Smoove — fire and forget
    createOrUpdateContact({
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      cellPhone: candidate.phone,
    }).catch((err) =>
      console.error("Smoove sync failed for updated candidate:", candidate.email, err)
    );

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

    // Unsubscribe from Smoove — fire and forget
    if (deleted.smooveContactId) {
      unsubscribeContact(deleted.smooveContactId).catch((err) =>
        console.error("Smoove unsubscribe failed for deleted candidate:", deleted.email, err)
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
