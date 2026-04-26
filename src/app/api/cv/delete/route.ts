import { NextRequest, NextResponse } from "next/server";
import {
  deleteWordPressMedia,
  findMediaIdByUrl,
  isWordPressMediaUrl,
} from "@/lib/wordpress-cv";

// Removes a CV from WordPress media library. Accepts either a `mediaId`
// (preferred when the caller has it) or a `url` (we'll look up the id).
// URLs that aren't on our WP install (legacy Elementor on a different site,
// or test data) are reported as a no-op success.
export async function POST(request: NextRequest) {
  try {
    const { url, mediaId } = await request.json();

    let id: number | null =
      typeof mediaId === "number" ? mediaId : null;
    if (!id && typeof url === "string") {
      if (!isWordPressMediaUrl(url)) {
        // Not on our WP install — nothing to delete here, treat as success
        return NextResponse.json({ success: true, data: { skipped: true } });
      }
      id = await findMediaIdByUrl(url);
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Could not resolve WordPress media id" },
        { status: 400 }
      );
    }

    await deleteWordPressMedia(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[cv/delete]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
