/**
 * Smoke test for WordPress media upload. Uploads a tiny text file, prints the
 * resulting public URL + WP media id, then deletes it.
 *
 * Run after configuring WP_BASE_URL, WP_USERNAME, WP_APPLICATION_PASSWORD
 * in .env.local.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  uploadCvToWordPress,
  deleteWordPressMedia,
  findMediaIdByUrl,
} from "../src/lib/wordpress-cv";

(async () => {
  console.log("Uploading test file to WordPress...");
  const uploaded = await uploadCvToWordPress(
    Buffer.from("hello from alok-crm test\n"),
    "alok-test.txt",
    "text/plain",
    "test-candidate"
  );
  console.log("✓ Uploaded:");
  console.log("  id:        ", uploaded.id);
  console.log("  filename:  ", uploaded.filename);
  console.log("  sourceUrl: ", uploaded.sourceUrl);

  console.log("\nLooking up by URL...");
  const found = await findMediaIdByUrl(uploaded.sourceUrl);
  console.log(`  findMediaIdByUrl → ${found}  (matches: ${found === uploaded.id})`);

  console.log("\nDeleting test file...");
  await deleteWordPressMedia(uploaded.id);
  console.log("✓ Deleted. WP integration is working.");
})().catch((e) => {
  console.error("✗ Test failed:", e.message);
  process.exit(1);
});
