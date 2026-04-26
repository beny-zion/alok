/**
 * WordPress media uploader for candidate CVs.
 *
 * The client already runs WP at alok.co.il and Elementor form submissions
 * land their CV files there. We piggy-back on that same media library so:
 *  1. The CV URL domain (alok.co.il) is never blocked by orthodox internet
 *     filters that the client uses.
 *  2. The files live alongside the existing Elementor uploads — same place,
 *     same backup story, same trash bin in WP Admin → Media.
 *
 * Auth uses an Application Password (WP Admin → Users → Profile →
 * Application Passwords). NOT the user's login password.
 *
 * Required env vars:
 *   WP_BASE_URL          e.g. https://alok.co.il
 *   WP_USERNAME          a WP admin/editor username
 *   WP_APPLICATION_PASSWORD   the generated app password (with or without spaces)
 */

function getConfig() {
  const base = process.env.WP_BASE_URL;
  const user = process.env.WP_USERNAME;
  const pass = process.env.WP_APPLICATION_PASSWORD;
  if (!base || !user || !pass) {
    throw new Error(
      "WordPress upload not configured — set WP_BASE_URL, WP_USERNAME, WP_APPLICATION_PASSWORD in .env.local"
    );
  }
  return {
    base: base.replace(/\/$/, ""),
    // WP accepts the app password with or without spaces; strip them for safety
    auth: "Basic " + Buffer.from(`${user}:${pass.replace(/\s+/g, "")}`).toString("base64"),
  };
}

export interface UploadedMedia {
  id: number;          // WP media ID
  sourceUrl: string;   // public URL (https://alok.co.il/wp-content/uploads/...)
  filename: string;    // file name as stored in WP
  mimeType: string;
}

/**
 * Uploads a CV file to the WordPress media library and returns the public URL.
 * The candidateId is used to prefix the filename so files are easy to spot in
 * WP Admin → Media when browsing by hand.
 */
export async function uploadCvToWordPress(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  candidateId?: string
): Promise<UploadedMedia> {
  const { base, auth } = getConfig();

  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const prefixedName = candidateId ? `cv-${candidateId}-${safeName}` : `cv-${Date.now()}-${safeName}`;

  const res = await fetch(`${base}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": mimeType,
      // The Disposition header is how WP REST API receives the filename
      "Content-Disposition": `attachment; filename="${prefixedName}"`,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress upload failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    id: number;
    source_url: string;
    title?: { rendered?: string };
    mime_type: string;
  };

  return {
    id: data.id,
    sourceUrl: data.source_url,
    filename: data.title?.rendered || prefixedName,
    mimeType: data.mime_type,
  };
}

/**
 * Deletes a media item from WordPress. We pass `force=true` so it skips the
 * trash and removes immediately — keeps the storage tidy.
 */
export async function deleteWordPressMedia(mediaId: number): Promise<void> {
  const { base, auth } = getConfig();
  const res = await fetch(`${base}/wp-json/wp/v2/media/${mediaId}?force=true`, {
    method: "DELETE",
    headers: { Authorization: auth },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress delete failed (${res.status}): ${text.slice(0, 300)}`);
  }
}

/**
 * Looks up a media item by its public URL — needed because we only store the
 * source URL on the candidate, not the WP media ID. WP REST API doesn't have
 * a built-in "find by url" endpoint, so we search by filename.
 */
export async function findMediaIdByUrl(url: string): Promise<number | null> {
  const { base, auth } = getConfig();
  // Extract just the filename slug (without extension) from the URL
  const filename = url.split("/").pop() || "";
  const slug = filename.replace(/\.[^.]+$/, "");
  if (!slug) return null;

  const res = await fetch(
    `${base}/wp-json/wp/v2/media?search=${encodeURIComponent(slug)}&per_page=5`,
    { headers: { Authorization: auth } }
  );
  if (!res.ok) return null;

  const items = (await res.json()) as Array<{ id: number; source_url: string }>;
  const exact = items.find((m) => m.source_url === url);
  return exact ? exact.id : items[0]?.id || null;
}

/** True if the URL points at this WP install's uploads dir. */
export function isWordPressMediaUrl(url: string): boolean {
  if (!url) return false;
  const base = (process.env.WP_BASE_URL || "").replace(/\/$/, "");
  return Boolean(base && url.startsWith(base) && url.includes("/wp-content/uploads/"));
}
