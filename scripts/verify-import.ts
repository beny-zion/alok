/**
 * Verify import integrity:
 *   1. Random spot-check — sample candidates and compare their DB state
 *      against the original CSV row stored in rawPayload.imports[].
 *   2. Duplicate detection — find potential duplicates by phone/idNumber/name.
 *
 * Run with:   npx tsx scripts/verify-import.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Candidate, type ICandidate } from "../src/models/candidate.model";

const SAMPLE_SIZE = 15;

interface ImportEntry {
  batchId: string;
  source: string;
  row: Record<string, string>;
  importedAt: Date;
}

function getImports(c: ICandidate): ImportEntry[] {
  const raw = c.rawPayload as Record<string, unknown> | undefined;
  return (raw?.imports as ImportEntry[]) ?? [];
}

function comparePair(
  label: string,
  dbValue: unknown,
  rawValue: string | undefined
): { ok: boolean; line: string } {
  const dbStr = dbValue == null ? "" : String(dbValue);
  const rawStr = (rawValue ?? "").toString().trim();

  if (!rawStr && !dbStr) return { ok: true, line: `    ${label}: (both empty)` };
  if (!rawStr) return { ok: true, line: `    ${label}: [no source] → DB="${dbStr}"` };

  // Allow case differences for email
  const dbNorm = label === "email" ? dbStr.toLowerCase() : dbStr;
  const rawNorm = label === "email" ? rawStr.toLowerCase() : rawStr;

  // Phone may be normalized in DB vs raw CSV — just check digits match
  if (label === "phone") {
    const dbDig = dbStr.replace(/\D/g, "");
    const rawDig = rawStr.replace(/\D/g, "");
    const match = dbDig === rawDig || dbDig.endsWith(rawDig) || rawDig.endsWith(dbDig);
    return {
      ok: match,
      line: `    ${match ? "✓" : "✗"} ${label}: DB="${dbStr}" CSV="${rawStr}"`,
    };
  }

  // fullName might have been split — check whether components are contained
  if (label === "name") {
    const dbCombined = `${(dbValue as { first: string; last: string }).first || ""} ${
      (dbValue as { first: string; last: string }).last || ""
    }`.trim();
    const parts = rawStr.split(/\s+/);
    const allPresent = parts.every((p) => dbCombined.includes(p));
    return {
      ok: allPresent,
      line: `    ${allPresent ? "✓" : "✗"} ${label}: DB="${dbCombined}" CSV="${rawStr}"`,
    };
  }

  const ok = dbNorm === rawNorm || dbNorm.includes(rawNorm) || rawNorm.includes(dbNorm);
  return {
    ok,
    line: `    ${ok ? "✓" : "✗"} ${label}: DB="${dbStr}" CSV="${rawStr}"`,
  };
}

async function spotCheck() {
  console.log("━".repeat(60));
  console.log(`🔍 SPOT-CHECK — ${SAMPLE_SIZE} random candidates`);
  console.log("━".repeat(60));

  const sample = (await Candidate.aggregate([
    { $match: { "rawPayload.imports.0": { $exists: true } } },
    { $sample: { size: SAMPLE_SIZE } },
  ])) as ICandidate[];

  let passed = 0;
  let failed = 0;

  for (const c of sample) {
    const imports = getImports(c);
    const first = imports[0];
    if (!first) continue;

    const row = first.row;
    const sourceLabel = first.source.replace("csv:", "");

    console.log(`\n📌 ${c.firstName || ""} ${c.lastName || ""} (${c._id})`);
    console.log(`   source: ${sourceLabel}`);
    console.log(`   tags: ${(c.tags || []).join(", ")}`);
    console.log(`   fields checked:`);

    // Figure out which row column maps to which DB field — use common header names
    const guess = (keys: string[]) => {
      for (const k of keys) {
        for (const header of Object.keys(row)) {
          if (header.trim().toLowerCase() === k.toLowerCase() || header.trim() === k) {
            return row[header];
          }
        }
      }
      return undefined;
    };

    const checks: Array<{ ok: boolean; line: string }> = [];

    // Name
    const rawName = guess(["שם", "שם מלא"]);
    const rawFirst = guess(["שם פרטי"]);
    const rawLast = guess(["שם משפחה"]);
    if (rawName) {
      checks.push(
        comparePair("name", { first: c.firstName, last: c.lastName }, rawName)
      );
    } else {
      if (rawFirst) checks.push(comparePair("firstName", c.firstName, rawFirst));
      if (rawLast) checks.push(comparePair("lastName", c.lastName, rawLast));
    }

    // Phone
    const rawPhone = guess(["טלפון", "נייד"]);
    if (rawPhone) checks.push(comparePair("phone", c.phone, rawPhone));

    // Email
    const rawEmail = guess(["מייל", "מייל להתקשרות", "אימייל"]);
    if (rawEmail) checks.push(comparePair("email", c.email, rawEmail));

    // ID
    const rawId = guess(["ת.ז.", 'ת"ז', "תז"]);
    if (rawId) checks.push(comparePair("idNumber", c.idNumber, rawId));

    // City
    const rawCity = guess(["עיר", "עיר מגורים", "כתובת "]);
    if (rawCity) checks.push(comparePair("city", c.city, rawCity));

    // Status
    const rawStatus = guess(["סטטוס", "התקבלה", "מעדכן", "האם חרדי"]);
    if (rawStatus) checks.push(comparePair("status", c.status, rawStatus));

    for (const check of checks) {
      console.log(check.line);
      if (check.ok) passed++;
      else failed++;
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Spot-check: ${passed} matched, ${failed} mismatched`);
  return { passed, failed };
}

async function findDuplicates() {
  console.log("\n" + "━".repeat(60));
  console.log("🔍 DUPLICATE DETECTION");
  console.log("━".repeat(60));

  // 1. Same normalized phone → multiple _ids
  const byPhone = await Candidate.aggregate([
    { $match: { phone: { $exists: true, $ne: "" } } },
    { $group: { _id: "$phone", count: { $sum: 1 }, ids: { $push: "$_id" }, names: { $push: { first: "$firstName", last: "$lastName" } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 },
  ]);

  console.log(`\nSame phone, different records: ${byPhone.length}`);
  byPhone.slice(0, 10).forEach((g) => {
    const names = (g.names as Array<{ first?: string; last?: string }>)
      .map((n) => `${n.first || ""} ${n.last || ""}`.trim() || "(no name)")
      .join(" | ");
    console.log(`   ${g._id} (${g.count}x): ${names}`);
  });

  // 2. Same idNumber → multiple _ids
  const byIdNumber = await Candidate.aggregate([
    { $match: { idNumber: { $exists: true, $ne: "" } } },
    { $group: { _id: "$idNumber", count: { $sum: 1 }, ids: { $push: "$_id" }, names: { $push: { first: "$firstName", last: "$lastName" } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  console.log(`\nSame idNumber, different records: ${byIdNumber.length}`);
  byIdNumber.slice(0, 10).forEach((g) => {
    const names = (g.names as Array<{ first?: string; last?: string }>)
      .map((n) => `${n.first || ""} ${n.last || ""}`.trim() || "(no name)")
      .join(" | ");
    console.log(`   ${g._id} (${g.count}x): ${names}`);
  });

  // 3. Same email → multiple _ids
  const byEmail = await Candidate.aggregate([
    { $match: { email: { $exists: true, $ne: "" } } },
    { $group: { _id: "$email", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  console.log(`\nSame email, different records: ${byEmail.length}`);
  byEmail.slice(0, 10).forEach((g) => {
    console.log(`   ${g._id} (${g.count}x)`);
  });

  // 4. Same name + city (potential duplicate with no shared key)
  const byNameCity = await Candidate.aggregate([
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
          first: { $toLower: { $ifNull: ["$firstName", ""] } },
          last: { $toLower: { $ifNull: ["$lastName", ""] } },
          city: "$city",
        },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        phones: { $push: "$phone" },
        emails: { $push: "$email" },
      },
    },
    { $match: { count: { $gt: 1 }, "_id.last": { $ne: "" } } },
    { $sort: { count: -1 } },
    { $limit: 30 },
  ]);

  console.log(`\nSame name+city (no shared identifier):  ${byNameCity.length}`);
  byNameCity.slice(0, 10).forEach((g) => {
    const phones = (g.phones as string[]).filter(Boolean).join(", ") || "(no phone)";
    console.log(
      `   ${g._id.first} ${g._id.last} | ${g._id.city || "(no city)"} (${g.count}x) — phones: ${phones}`
    );
  });

  return {
    phoneCount: byPhone.length,
    idNumberCount: byIdNumber.length,
    emailCount: byEmail.length,
    nameCityCount: byNameCity.length,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const spot = await spotCheck();
  const dupes = await findDuplicates();

  console.log("\n" + "━".repeat(60));
  console.log("📋 FINAL REPORT");
  console.log("━".repeat(60));
  console.log(`Spot-check: ${spot.passed} matched / ${spot.failed} mismatched`);
  console.log(`Duplicate groups found:`);
  console.log(`   by phone:    ${dupes.phoneCount}`);
  console.log(`   by idNumber: ${dupes.idNumberCount}`);
  console.log(`   by email:    ${dupes.emailCount}`);
  console.log(`   by name+city (soft): ${dupes.nameCityCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
