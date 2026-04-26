import { NextRequest, NextResponse } from "next/server";
import { uploadCvToWordPress } from "@/lib/wordpress-cv";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

// Receives a CV via multipart/form-data and forwards it to WordPress media.
// Server-side because the WP Application Password lives only in our env.
// Vercel's request-body limit is 4.5MB on Hobby/Pro — files above that fail
// here. The client validates size before sending.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const candidateId = form.get("candidateId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "הקובץ גדול מדי (מקסימום 10MB)" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `סוג קובץ לא נתמך: ${file.type}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadCvToWordPress(
      buffer,
      file.name,
      file.type,
      typeof candidateId === "string" ? candidateId : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        // Match the shape the CVUploader expects (was Drive-shaped before)
        id: String(uploaded.id),
        name: uploaded.filename,
        webViewLink: uploaded.sourceUrl,
        downloadLink: uploaded.sourceUrl,
      },
    });
  } catch (error) {
    console.error("[cv/upload]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
