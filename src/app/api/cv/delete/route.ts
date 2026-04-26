import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

// Removes a CV from Vercel Blob. Called when the user replaces or clears
// a CV from the candidate edit form. The DB cvUrl is updated by the
// candidate PUT endpoint — this only deletes the underlying file.
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "url is required" },
        { status: 400 }
      );
    }
    // Only allow deletion of files in our blob store (cv/ prefix)
    if (!url.includes("/cv/")) {
      return NextResponse.json(
        { success: false, error: "URL is not a CV blob" },
        { status: 400 }
      );
    }
    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[cv/delete]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
