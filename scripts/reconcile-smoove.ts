/**
 * Reconcile Smoove — cross-check which candidates are ACTUALLY in Smoove.
 *
 * Why: our DB flag `smooveSynced` trusts Smoove's 200 OK response, but Smoove
 * sometimes silently drops contacts (free-tier overflow, duplicate emails).
 * This script fetches every contact from Smoove, compares with the DB, and
 * corrects drifts in either direction.
 *
 * Run:   npx tsx scripts/reconcile-smoove.ts              (dry-run — preview only)
 *        npx tsx scripts/reconcile-smoove.ts --apply      (actually update DB)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Candidate } from "../src/models/candidate.model";

const BASE = process.env.SMOOVE_API_URL || "https://rest.smoove.io/v1";
const KEY = process.env.SMOOVE_API_KEY!;
const APPLY = process.argv.includes("--apply");

interface SmooveContact {
  id: number;
  email?: string;
}

async function fetchAllSmooveContacts(): Promise<Map<string, number>> {
  const byEmail = new Map<string, number>();
  let page = 1;
  while (page <= 100) {
    const r = await fetch(`${BASE}/Contacts?page=${page}&pageSize=100`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) throw new Error(`Smoove /Contacts page ${page} → ${r.status}`);
    const arr = (await r.json()) as SmooveContact[];
    for (const c of arr) {
      if (c.email) byEmail.set(c.email.trim().toLowerCase(), c.id);
    }
    if (arr.length < 100) break;
    page++;
  }
  return byEmail;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  console.log(`Mode: ${APPLY ? "APPLY (writing to DB)" : "DRY-RUN (no changes)"}\n`);
  console.log("Fetching all contacts from Smoove...");
  const smooveByEmail = await fetchAllSmooveContacts();
  console.log(`  → Smoove has ${smooveByEmail.size} contacts\n`);

  const dbWithEmail = await Candidate.find({ email: { $exists: true, $ne: "" } })
    .select("_id email smooveSynced smooveContactId")
    .lean();
  console.log(`DB has ${dbWithEmail.length} candidates with an email`);
  const marked = dbWithEmail.filter((c) => c.smooveSynced === true);
  console.log(`  → of which ${marked.length} marked smooveSynced=true\n`);

  const markedButMissing: typeof dbWithEmail = [];
  const missingButPresent: typeof dbWithEmail = [];
  const contactIdUpdates: Array<{ _id: unknown; smooveContactId: number }> = [];

  for (const c of dbWithEmail) {
    const emailKey = c.email!.trim().toLowerCase();
    const smooveId = smooveByEmail.get(emailKey);
    const inSmoove = smooveId !== undefined;

    if (c.smooveSynced && !inSmoove) {
      markedButMissing.push(c);
    } else if (!c.smooveSynced && inSmoove) {
      missingButPresent.push(c);
    } else if (inSmoove && smooveId !== c.smooveContactId) {
      contactIdUpdates.push({ _id: c._id, smooveContactId: smooveId });
    }
  }

  console.log("━━ DRIFTS ━━");
  console.log(`  marked synced but NOT in Smoove: ${markedButMissing.length}`);
  console.log(`  in Smoove but NOT marked synced: ${missingButPresent.length}`);
  console.log(`  contactId needs update:          ${contactIdUpdates.length}`);

  if (markedButMissing.length > 0) {
    console.log("\nTo reset (will set smooveSynced=false, smooveError='reconcile: not in Smoove'):");
    for (const c of markedButMissing.slice(0, 20)) console.log(`  ${c.email}`);
    if (markedButMissing.length > 20)
      console.log(`  ...and ${markedButMissing.length - 20} more`);
  }
  if (missingButPresent.length > 0) {
    console.log("\nTo promote (will set smooveSynced=true, link contactId):");
    for (const c of missingButPresent.slice(0, 20)) console.log(`  ${c.email}`);
    if (missingButPresent.length > 20)
      console.log(`  ...and ${missingButPresent.length - 20} more`);
  }

  if (!APPLY) {
    console.log("\n💡 Re-run with --apply to write these changes.");
    await mongoose.disconnect();
    return;
  }

  if (markedButMissing.length > 0) {
    await Candidate.updateMany(
      { _id: { $in: markedButMissing.map((c) => c._id) } },
      {
        $unset: { smooveSynced: "", smooveSyncedAt: "", smooveContactId: "" },
        $set: { smooveError: "reconcile: not in Smoove" },
      }
    );
    console.log(`\n✓ Reset ${markedButMissing.length} stale flags`);
  }

  if (missingButPresent.length > 0) {
    for (const c of missingButPresent) {
      const smooveId = smooveByEmail.get(c.email!.trim().toLowerCase())!;
      await Candidate.updateOne(
        { _id: c._id },
        {
          $set: {
            smooveSynced: true,
            smooveSyncedAt: new Date(),
            smooveContactId: smooveId,
          },
          $unset: { smooveError: "" },
        }
      );
    }
    console.log(`✓ Promoted ${missingButPresent.length} to synced`);
  }

  if (contactIdUpdates.length > 0) {
    for (const u of contactIdUpdates) {
      await Candidate.updateOne({ _id: u._id }, { $set: { smooveContactId: u.smooveContactId } });
    }
    console.log(`✓ Linked ${contactIdUpdates.length} missing contactIds`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
