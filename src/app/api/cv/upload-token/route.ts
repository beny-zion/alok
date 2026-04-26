import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

// Issues short-lived upload tokens to the browser so the client can PUT a CV
// directly to Vercel Blob without routing the file through our server (avoids
// the 4.5MB body limit on Vercel functions).
//
// All CVs are stored under the `cv/` prefix inside this project's Blob store
// so they're visually grouped in the Vercel Storage dashboard.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Enforce the cv/ prefix server-side regardless of what the client sent
        if (!pathname.startsWith("cv/")) {
          throw new Error("Path must be under cv/");
        }
        return {
          allowedContentTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async () => {
        // No-op — the client picks up the resulting URL and saves it to the
        // candidate via the existing PUT /api/candidates/[id]
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    console.error("[cv/upload-token]", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
