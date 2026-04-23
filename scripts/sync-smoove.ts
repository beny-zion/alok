/**
 * Supervised Smoove sync — pushes every candidate with an email to Smoove,
 * updates smooveSynced / smooveSyncedAt / smooveError per record, and stops
 * gracefully on free-tier limit. Safe to re-run: already-synced candidates
 * are skipped.
 *
 * Run with:   npx tsx scripts/sync-smoove.ts
 *             npx tsx scripts/sync-smoove.ts --retry-failed
 *             npx tsx scripts/sync-smoove.ts --max 200
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Candidate } from "../src/models/candidate.model";
import { bulkImportContacts } from "../src/lib/smoove";

const BATCH_SIZE = 100;

function parseArgs() {
  const args = process.argv.slice(2);
  const retryFailed = args.includes("--retry-failed");
  const maxIdx = args.indexOf("--max");
  const max = maxIdx >= 0 && args[maxIdx + 1] ? Number(args[maxIdx + 1]) : Infinity;
  return { retryFailed, max };
}

async function printState(label: string) {
  const total = await Candidate.countDocuments();
  const withEmail = await Candidate.countDocuments({ email: { $exists: true, $ne: "" } });
  const synced = await Candidate.countDocuments({ smooveSynced: true });
  const pending = await Candidate.countDocuments({
    email: { $exists: true, $ne: "" },
    smooveSynced: { $ne: true },
  });
  const failed = await Candidate.countDocuments({
    smooveError: { $exists: true, $ne: null },
    smooveSynced: { $ne: true },
  });

  console.log(`\n━━ ${label} ━━`);
  console.log(`  Total:          ${total}`);
  console.log(`  With email:     ${withEmail}`);
  console.log(`  Smoove synced:  ${synced}`);
  console.log(`  Pending sync:   ${pending}`);
  console.log(`  Last failed:    ${failed}`);
}

async function main() {
  if (!process.env.SMOOVE_API_KEY) {
    console.error("❌ SMOOVE_API_KEY missing from .env.local");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  const { retryFailed, max } = parseArgs();

  await printState("BEFORE");

  const query: Record<string, unknown> = {
    email: { $exists: true, $ne: "" },
    smooveSynced: { $ne: true },
  };
  if (!retryFailed) {
    query.smooveError = { $in: [null, undefined] };
  }

  const pending = await Candidate.find(query)
    .limit(Number.isFinite(max) ? max : 0)
    .lean();

  if (pending.length === 0) {
    console.log("\n✅ Nothing to sync.");
    await mongoose.disconnect();
    return;
  }

  console.log(
    `\n🚀 Syncing ${pending.length} candidate(s) in batches of ${BATCH_SIZE}${
      retryFailed ? " (including previously failed)" : ""
    }...`
  );

  const defaultListId = process.env.SMOOVE_DEFAULT_LIST_ID
    ? Number(process.env.SMOOVE_DEFAULT_LIST_ID)
    : undefined;

  let synced = 0;
  let failed = 0;
  let limitHit = false;
  let lastError: string | undefined;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

    process.stdout.write(
      `  batch ${batchNum}/${totalBatches} (${batch.length} contacts)... `
    );

    const contacts = batch.map((c) => ({
      email: c.email!,
      firstName: c.firstName,
      lastName: c.lastName,
      cellPhone: c.phone,
    }));

    const result = await bulkImportContacts(contacts, defaultListId);
    const ids = batch.map((c) => c._id);

    if (result.success) {
      await Candidate.updateMany(
        { _id: { $in: ids } },
        {
          $set: { smooveSynced: true, smooveSyncedAt: new Date() },
          $unset: { smooveError: "" },
        }
      );
      synced += batch.length;
      console.log(`✓ synced (${synced} total)`);
    } else {
      await Candidate.updateMany(
        { _id: { $in: ids } },
        { $set: { smooveSynced: false, smooveError: result.error } }
      );
      failed += batch.length;
      lastError = result.error;
      console.log(`✗ failed — ${result.error}`);

      if (result.limitExceeded) {
        limitHit = true;
        console.log("  🛑 Smoove limit reached — stopping cleanly.");
        break;
      }
    }
  }

  console.log(`\n━━ RESULT ━━`);
  console.log(`  Attempted:  ${Math.min(synced + failed, pending.length)}`);
  console.log(`  Synced:     ${synced}`);
  console.log(`  Failed:     ${failed}`);
  if (limitHit) console.log(`  Limit hit:  yes (Smoove free-tier cap)`);
  if (lastError) console.log(`  Last error: ${lastError}`);

  await printState("AFTER");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
