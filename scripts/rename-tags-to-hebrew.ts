/**
 * One-shot migration: renames English CSV-import tags to Hebrew labels
 * that match the actual source-sheet filenames.
 *
 * Run: npx tsx scripts/rename-tags-to-hebrew.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { Candidate } from "../src/models/candidate.model";

const TAG_MAP: Record<string, string> = {
  "aerospace-2": "תעשיה אווירית 2",
  "aerospace-women": "תעשיה אווירית - בנות",
  "aerospace-men": "הרשמה לתעשיה אווירית",
  "tomer-interview": "סיור וראיון בתומר",
  "main-list": "מחפשי עבודה",
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected. Starting tag rename...\n");

  for (const [oldTag, newTag] of Object.entries(TAG_MAP)) {
    // Replace oldTag with newTag inside the tags array for every matching doc
    const result = await Candidate.updateMany(
      { tags: oldTag },
      [
        {
          $set: {
            tags: {
              $map: {
                input: "$tags",
                as: "t",
                in: {
                  $cond: [{ $eq: ["$$t", oldTag] }, newTag, "$$t"],
                },
              },
            },
          },
        },
      ]
    );
    console.log(`  ${oldTag.padEnd(22)} → ${newTag}  (${result.modifiedCount} docs)`);
  }

  // Deduplicate — in case a doc already had both English and Hebrew versions
  const dedup = await Candidate.updateMany(
    {},
    [{ $set: { tags: { $setUnion: ["$tags", []] } } }]
  );
  console.log(`\n  Deduplicated tags array in ${dedup.modifiedCount} docs`);

  // Verify: list remaining distinct tag values
  const allTags = await Candidate.distinct("tags");
  console.log("\n  Current distinct tags in DB:");
  for (const t of allTags.filter(Boolean).sort()) {
    const count = await Candidate.countDocuments({ tags: t });
    console.log(`    ${t}  (${count})`);
  }

  await mongoose.disconnect();
  console.log("\n✓ Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
