/**
 * Merge duplicate candidates in the DB.
 *
 * Strategy:
 *   1. Find groups sharing the same normalized phone.
 *   2. Find groups sharing the same idNumber.
 *   3. For each group:
 *      - "primary" = oldest createdAt (preserves history)
 *      - Fill empty/null fields on primary from the other records.
 *      - Union arrays: tags, sectors, additionalLanguages.
 *      - Concatenate rawPayload.imports[] across all.
 *      - smooveSynced = true if ANY was synced.
 *      - Keep first non-empty smooveContactId.
 *      - Delete the other records.
 *
 * Run:   npx tsx scripts/merge-duplicates.ts
 * Dry:   npx tsx scripts/merge-duplicates.ts --dry
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Candidate, type ICandidate } from "../src/models/candidate.model";

const DRY_RUN = process.argv.includes("--dry");

// Fields handled with special union/concat logic — don't use the "prefer primary" rule.
const ARRAY_UNION_FIELDS = new Set(["tags", "sectors", "additionalLanguages"]);
const SKIP_FIELDS = new Set(["_id", "createdAt", "updatedAt", "__v", "rawPayload", ...ARRAY_UNION_FIELDS]);

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

type CandidateDoc = ICandidate & { _id: mongoose.Types.ObjectId };

function fieldCount(d: CandidateDoc): number {
  const obj = d.toObject ? d.toObject() : (d as unknown as Record<string, unknown>);
  const SKIP = new Set([
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "rawPayload",
    "source",
    "noEmail",
    "smooveSynced",
    "smooveError",
    "importBatchId",
  ]);
  let n = 0;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SKIP.has(k)) continue;
    if (!isEmpty(v)) n++;
  }
  return n;
}

function mergeGroup(docs: CandidateDoc[]): {
  primaryId: mongoose.Types.ObjectId;
  update: Record<string, unknown>;
  toDelete: mongoose.Types.ObjectId[];
  conflicts: string[];
} {
  // Primary = record with the most populated fields.
  // Tiebreaker: oldest (preserves original createdAt history).
  docs.sort((a, b) => {
    const diff = fieldCount(b) - fieldCount(a);
    if (diff !== 0) return diff;
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return at - bt;
  });

  const primary = docs[0];
  const rest = docs.slice(1);
  const update: Record<string, unknown> = {};
  const conflicts: string[] = [];

  // Collect all field keys across all docs
  const allKeys = new Set<string>();
  for (const d of docs) {
    for (const k of Object.keys(d.toObject ? d.toObject() : d)) {
      allKeys.add(k);
    }
  }

  const primaryObj = primary.toObject ? primary.toObject() : (primary as unknown as Record<string, unknown>);

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;

    const primaryVal = (primaryObj as Record<string, unknown>)[key];
    if (!isEmpty(primaryVal)) {
      // Primary already has a value. Detect conflicts (another record has a different non-empty value).
      for (const other of rest) {
        const otherObj = other.toObject ? other.toObject() : (other as unknown as Record<string, unknown>);
        const otherVal = (otherObj as Record<string, unknown>)[key];
        if (!isEmpty(otherVal) && JSON.stringify(otherVal) !== JSON.stringify(primaryVal)) {
          conflicts.push(`${key}: primary="${primaryVal}" vs "${otherVal}"`);
        }
      }
      continue;
    }

    // Primary empty — fill from first non-empty record.
    for (const other of rest) {
      const otherObj = other.toObject ? other.toObject() : (other as unknown as Record<string, unknown>);
      const otherVal = (otherObj as Record<string, unknown>)[key];
      if (!isEmpty(otherVal)) {
        update[key] = otherVal;
        break;
      }
    }
  }

  // Array-union fields
  for (const key of ARRAY_UNION_FIELDS) {
    const all: string[] = [];
    for (const d of docs) {
      const obj = d.toObject ? d.toObject() : (d as unknown as Record<string, unknown>);
      const v = (obj as Record<string, unknown>)[key];
      if (Array.isArray(v)) all.push(...(v as string[]));
    }
    const merged = Array.from(new Set(all.filter(Boolean)));
    // Only update if different from primary's current value
    const currentPrimary = (primaryObj as Record<string, unknown>)[key];
    if (JSON.stringify(currentPrimary) !== JSON.stringify(merged)) {
      update[key] = merged;
    }
  }

  // rawPayload: concat imports[], preserve primary's webhook
  const rawMerged: Record<string, unknown> = {};
  const primaryRaw = (primaryObj as Record<string, unknown>).rawPayload as Record<string, unknown> | undefined;
  if (primaryRaw?.webhook) rawMerged.webhook = primaryRaw.webhook;

  const allImports: unknown[] = [];
  for (const d of docs) {
    const obj = d.toObject ? d.toObject() : (d as unknown as Record<string, unknown>);
    const raw = (obj as Record<string, unknown>).rawPayload as Record<string, unknown> | undefined;
    if (raw?.imports && Array.isArray(raw.imports)) allImports.push(...raw.imports);
    if (raw?.webhook && !rawMerged.webhook) rawMerged.webhook = raw.webhook;
  }
  if (allImports.length > 0) rawMerged.imports = allImports;
  if (Object.keys(rawMerged).length > 0) update.rawPayload = rawMerged;

  // Smoove sync: true if any was synced
  const anySynced = docs.some((d) => d.smooveSynced === true);
  if (anySynced && !primary.smooveSynced) {
    update.smooveSynced = true;
    const syncedDoc = docs.find((d) => d.smooveSynced && d.smooveSyncedAt);
    if (syncedDoc?.smooveSyncedAt) update.smooveSyncedAt = syncedDoc.smooveSyncedAt;
  }

  // smooveContactId: keep any present one
  if (!primary.smooveContactId) {
    const withId = docs.find((d) => d.smooveContactId);
    if (withId) update.smooveContactId = withId.smooveContactId;
  }

  // noEmail: false if any has email (primary might still be noEmail if merged)
  const anyEmail = docs.some((d) => d.email);
  if (anyEmail) update.noEmail = false;

  return {
    primaryId: primary._id,
    update,
    toDelete: rest.map((d) => d._id),
    conflicts,
  };
}

async function findDupeGroups(key: "phone" | "idNumber"): Promise<CandidateDoc[][]> {
  const groups = await Candidate.aggregate([
    { $match: { [key]: { $exists: true, $ne: "" } } },
    { $group: { _id: `$${key}`, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const result: CandidateDoc[][] = [];
  for (const g of groups) {
    const docs = (await Candidate.find({ _id: { $in: g.ids } })) as CandidateDoc[];
    if (docs.length > 1) result.push(docs);
  }
  return result;
}

async function findSoftDupeGroups(): Promise<CandidateDoc[][]> {
  const groups = await Candidate.aggregate([
    {
      $match: {
        $or: [
          { firstName: { $exists: true, $ne: "" } },
          { lastName: { $exists: true, $ne: "" } },
        ],
      },
    },
    {
      $group: {
        _id: {
          first: { $toLower: { $trim: { input: { $ifNull: ["$firstName", ""] } } } },
          last: { $toLower: { $trim: { input: { $ifNull: ["$lastName", ""] } } } },
          city: { $ifNull: ["$city", ""] },
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  const result: CandidateDoc[][] = [];
  for (const g of groups) {
    // Safeguard: require at least some name content (not both empty)
    if (!g._id.first && !g._id.last) continue;
    const docs = (await Candidate.find({ _id: { $in: g.ids } })) as CandidateDoc[];
    if (docs.length > 1) result.push(docs);
  }
  return result;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in .env.local");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`[merge] Connected. Mode: ${DRY_RUN ? "DRY-RUN" : "LIVE"}`);

  const totals = { groups: 0, merged: 0, deleted: 0, conflicts: 0 };

  // Pass 1: phone duplicates
  console.log("\n━".repeat(60));
  console.log("🔍 Pass 1 — PHONE duplicates");
  console.log("━".repeat(60));

  const phoneGroups = await findDupeGroups("phone");
  console.log(`Found ${phoneGroups.length} phone groups`);

  for (const group of phoneGroups) {
    const phone = group[0].phone;
    const result = mergeGroup(group);

    const names = group
      .map((d) => `${d.firstName || ""} ${d.lastName || ""}`.trim() || "(no name)")
      .join(" | ");

    console.log(`\n📞 ${phone} (${group.length}x): ${names}`);
    console.log(`   primary: ${result.primaryId} (most complete)`);
    console.log(`   will delete: ${result.toDelete.length}`);
    if (result.conflicts.length > 0) {
      console.log(`   ⚠️  conflicts (primary kept, other ignored):`);
      result.conflicts.forEach((c) => console.log(`      ${c}`));
      totals.conflicts += result.conflicts.length;
    }
    const updateKeys = Object.keys(result.update);
    if (updateKeys.length > 0) {
      console.log(`   will fill: ${updateKeys.join(", ")}`);
    }

    if (!DRY_RUN) {
      await Candidate.updateOne({ _id: result.primaryId }, { $set: result.update });
      await Candidate.deleteMany({ _id: { $in: result.toDelete } });
    }

    totals.groups++;
    totals.merged++;
    totals.deleted += result.toDelete.length;
  }

  // Pass 2: idNumber duplicates (after phone merges, re-query)
  console.log("\n" + "━".repeat(60));
  console.log("🔍 Pass 2 — ID NUMBER duplicates");
  console.log("━".repeat(60));

  const idGroups = await findDupeGroups("idNumber");
  console.log(`Found ${idGroups.length} idNumber groups`);

  for (const group of idGroups) {
    const id = group[0].idNumber;
    const result = mergeGroup(group);

    const names = group
      .map((d) => `${d.firstName || ""} ${d.lastName || ""}`.trim() || "(no name)")
      .join(" | ");

    console.log(`\n🆔 ${id} (${group.length}x): ${names}`);
    console.log(`   primary: ${result.primaryId} (most complete)`);
    console.log(`   will delete: ${result.toDelete.length}`);
    if (result.conflicts.length > 0) {
      console.log(`   ⚠️  conflicts:`);
      result.conflicts.forEach((c) => console.log(`      ${c}`));
      totals.conflicts += result.conflicts.length;
    }
    const updateKeys = Object.keys(result.update);
    if (updateKeys.length > 0) {
      console.log(`   will fill: ${updateKeys.join(", ")}`);
    }

    if (!DRY_RUN) {
      await Candidate.updateOne({ _id: result.primaryId }, { $set: result.update });
      await Candidate.deleteMany({ _id: { $in: result.toDelete } });
    }

    totals.groups++;
    totals.merged++;
    totals.deleted += result.toDelete.length;
  }

  // Pass 3: name + city soft duplicates
  console.log("\n" + "━".repeat(60));
  console.log("🔍 Pass 3 — NAME+CITY soft duplicates");
  console.log("━".repeat(60));

  const softGroups = await findSoftDupeGroups();
  console.log(`Found ${softGroups.length} soft groups`);

  let skippedAmbiguous = 0;
  for (const group of softGroups) {
    // Safeguard: if group has DIFFERENT phones or DIFFERENT idNumbers,
    // these are likely different people. Skip and report.
    const distinctPhones = new Set(group.map((d) => d.phone).filter(Boolean));
    const distinctIds = new Set(group.map((d) => d.idNumber).filter(Boolean));
    if (distinctPhones.size > 1 || distinctIds.size > 1) {
      const names = group
        .map((d) => `${d.firstName || ""} ${d.lastName || ""}`.trim() || "(no name)")
        .join(" | ");
      console.log(`\n⏭  SKIP (ambiguous — different phones/IDs): ${names}`);
      if (distinctPhones.size > 1) console.log(`      phones: ${[...distinctPhones].join(", ")}`);
      if (distinctIds.size > 1) console.log(`      ids: ${[...distinctIds].join(", ")}`);
      skippedAmbiguous++;
      continue;
    }

    const result = mergeGroup(group);
    const names = group
      .map((d) => `${d.firstName || ""} ${d.lastName || ""}`.trim() || "(no name)")
      .join(" | ");
    const city = group[0].city || "(no city)";
    const phones = group.map((d) => d.phone).filter(Boolean).join(", ") || "(no phone)";

    console.log(`\n👤 ${names} | ${city} (${group.length}x)`);
    console.log(`   phones kept: ${phones}`);
    console.log(`   primary: ${result.primaryId} (most complete)`);
    console.log(`   will delete: ${result.toDelete.length}`);
    if (result.conflicts.length > 0) {
      console.log(`   ⚠️  conflicts (primary kept, other ignored):`);
      result.conflicts.slice(0, 5).forEach((c) => console.log(`      ${c}`));
      if (result.conflicts.length > 5) {
        console.log(`      ...+${result.conflicts.length - 5} more`);
      }
      totals.conflicts += result.conflicts.length;
    }
    const updateKeys = Object.keys(result.update);
    if (updateKeys.length > 0) {
      console.log(`   will fill: ${updateKeys.join(", ")}`);
    }

    if (!DRY_RUN) {
      await Candidate.updateOne({ _id: result.primaryId }, { $set: result.update });
      await Candidate.deleteMany({ _id: { $in: result.toDelete } });
    }

    totals.groups++;
    totals.merged++;
    totals.deleted += result.toDelete.length;
  }

  console.log("\n" + "━".repeat(60));
  console.log("📋 MERGE SUMMARY");
  console.log("━".repeat(60));
  console.log(`Mode:              ${DRY_RUN ? "DRY-RUN (no changes)" : "LIVE (changes committed)"}`);
  console.log(`Groups merged:     ${totals.merged}`);
  console.log(`Records deleted:   ${totals.deleted}`);
  console.log(`Conflicts:         ${totals.conflicts} (primary value kept)`);
  console.log(`Ambiguous skipped: ${skippedAmbiguous} (different phones/IDs — need manual review)`);

  const totalAfter = await Candidate.countDocuments();
  console.log(`Total in DB after: ${totalAfter}`);

  await mongoose.disconnect();
  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
