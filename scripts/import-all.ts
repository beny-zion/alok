/**
 * Supervised import script — reads each CSV in ./Sheets, inserts into MongoDB,
 * then syncs to Smoove in batches of 100 (free-tier limit), stops gracefully
 * if Smoove refuses further contacts, and prints a full report.
 *
 * Run with:   npx tsx scripts/import-all.ts
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import Papa from "papaparse";
import dotenv from "dotenv";

// Load env
dotenv.config({ path: ".env.local" });

import { Candidate } from "../src/models/candidate.model";
import { bulkImportContacts } from "../src/lib/smoove";
import { normalizePhone } from "../src/lib/phone";

// -------- Config: one mapping per file --------
type CandidateField =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "city"
  | "address"
  | "sectors"
  | "age"
  | "gender"
  | "idNumber"
  | "status"
  | "statusNotes"
  | "registrationDate"
  | "cvUrl"
  | "jobType"
  | "jobPermanence"
  | "salaryExpectation"
  | "placedJob"
  | "placedCompany"
  | "additionalInfo"
  | "freeText"
  | "ignore";

type NameSplit = "first-space" | "lastname-only" | "firstname-only" | "fullname-only";

interface FilePlan {
  file: string;
  tag: string;
  nameSplit: NameSplit;
  skipLines?: number; // number of empty leading lines before headers
  mapping: Record<string, CandidateField>;
}

const SHEETS_DIR = path.join(process.cwd(), "Sheets");

// Column mappings per file — built from the actual headers in ./Sheets
const PLANS: FilePlan[] = [
  {
    file: "תעשיה אוירית 2 - גיליון1.csv",
    tag: "תעשיה אווירית 2",
    nameSplit: "first-space",
    mapping: {
      שם: "fullName",
      טלפון: "phone",
      "ת.ז.": "idNumber",
      התקבלה: "status",
      "קורות חיים": "cvUrl",
      "מעונינת להמשיך": "statusNotes",
      "": "city", // unnamed trailing column
    },
  },
  {
    file: "תעשיה אוירית 2 - גיליון1 (1).csv",
    tag: "תעשיה אווירית 2",
    nameSplit: "first-space",
    mapping: {
      שם: "fullName",
      טלפון: "phone",
      "ת.ז.": "idNumber",
      התקבלה: "status",
      "קורות חיים": "cvUrl",
      "מעונינת להמשיך": "statusNotes",
      "": "city",
    },
  },
  {
    file: "הרשמה לתעשיה אוירית - בנות.csv",
    tag: "תעשיה אווירית - בנות",
    nameSplit: "first-space",
    mapping: {
      "תאריך רישום": "registrationDate",
      שם: "fullName",
      נייד: "phone",
      "כתובת ": "city",
      מייל: "email",
      מגדר: "gender",
      "ת.ז.": "idNumber",
      "האם חרדי": "status", // repurposed for status notes
      "גיל ": "age",
      "קורות חיים": "cvUrl",
    },
  },
  {
    file: "הרשמה לתעשיה אוירית - גיליון1.csv",
    tag: "הרשמה לתעשיה אווירית",
    nameSplit: "first-space",
    mapping: {
      " ": "registrationDate", // date col has space header
      שם: "fullName",
      נייד: "phone",
      "כתובת ": "city",
      מייל: "email",
      מגדר: "gender",
      "ת.ז.": "idNumber",
      מעדכן: "status",
    },
  },
  {
    file: "קבוצה לסיור וראיון בתומר - גיליון1.csv",
    tag: "סיור וראיון בתומר",
    nameSplit: "first-space",
    mapping: {
      "  ": "registrationDate", // date col leading spaces
      שם: "fullName",
      נייד: "phone",
      "כתובת ": "city",
      מייל: "email",
      מגדר: "gender",
      "קורות חיים": "cvUrl",
    },
  },
  {
    file: "עותק של AL - 11 באפריל, 21_58 - מחפשי עבודה.csv",
    tag: "מחפשי עבודה",
    nameSplit: "fullname-only",
    skipLines: 3,
    mapping: {
      "מספר מחפש עבודה": "ignore",
      "תאריך התקשרות ראשונה": "registrationDate",
      "שם משפחה": "lastName",
      "שם פרטי": "firstName",
      טלפון: "phone",
      "מייל להתקשרות": "email",
      מין: "gender",
      "עיר מגורים": "city",
      "קטגורית עבודה": "sectors",
      "קורות חיים": "cvUrl",
      "סוג מישרה": "jobType",
      "אזור עבודה": "address",
      "תיאור נוסף לעבודה": "additionalInfo",
      "כמה ימים מאז שהגיעה": "ignore",
      סטטוס: "status",
      "משרה שסגר": "placedJob",
      "חברה שסגר": "placedCompany",
      "תשלום ראשון בתאריך": "ignore",
      "תשלום שני בתאריך": "statusNotes",
    },
  },
];

// -------- Helpers --------

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const y = m[3];
    const year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const p = new Date(s);
  return isNaN(p.getTime()) ? undefined : p;
}

function splitName(
  first: string | undefined,
  last: string | undefined,
  full: string | undefined,
  strategy: NameSplit
) {
  const out: { firstName?: string; lastName?: string; fullName?: string } = {};
  if (first) out.firstName = first;
  if (last) out.lastName = last;
  if (full) out.fullName = full;

  if (strategy === "first-space" && full && !first && !last) {
    const t = full.trim();
    const i = t.indexOf(" ");
    if (i === -1) out.firstName = t;
    else {
      out.firstName = t.slice(0, i);
      out.lastName = t.slice(i + 1);
    }
  } else if (strategy === "lastname-only" && full && !last) {
    out.lastName = full.trim();
  } else if (strategy === "firstname-only" && full && !first) {
    out.firstName = full.trim();
  }
  return out;
}

function buildPayload(
  row: Record<string, string>,
  plan: FilePlan,
  batchId: string
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const [col, field] of Object.entries(plan.mapping)) {
    if (field === "ignore") continue;
    const raw = row[col];
    if (raw == null) continue;
    const val = String(raw).trim();
    if (!val) continue;

    if (field === "sectors") {
      data.sectors = val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    } else if (field === "age" || field === "salaryExpectation") {
      const n = Number(val);
      if (!isNaN(n)) data[field] = n;
    } else if (field === "registrationDate") {
      const d = parseDate(val);
      if (d) data.registrationDate = d;
    } else if (field === "phone") {
      const n = normalizePhone(val);
      if (n) data.phone = n;
    } else if (field === "email") {
      const trimmed = val.toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) data.email = trimmed;
    } else {
      data[field] = val;
    }
  }

  const name = splitName(
    data.firstName as string | undefined,
    data.lastName as string | undefined,
    data.fullName as string | undefined,
    plan.nameSplit
  );
  Object.assign(data, name);

  data.noEmail = !data.email;
  data.tags = [plan.tag];
  data.importBatchId = batchId;
  data.source = "csv-import";
  data.smooveSynced = false;

  return data;
}

function dupeFilter(data: Record<string, unknown>) {
  if (data.email) return { email: data.email };
  if (data.idNumber) return { idNumber: data.idNumber };
  if (data.phone) return { phone: data.phone };
  return null;
}

function parseCsvFile(filePath: string, skipLines: number | undefined) {
  let text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (skipLines && skipLines > 0) {
    text = text.split(/\r?\n/).slice(skipLines).join("\n");
  }
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const rows = parsed.data.filter((r) =>
    Object.values(r).some((v) => v && String(v).trim() !== "")
  );
  return { rows, headers: parsed.meta.fields || [] };
}

// -------- Main --------

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in .env.local");
    process.exit(1);
  }
  console.log("[import] Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("[import] Connected.\n");

  // Drop old unique email index if present, then sync schema indexes
  try {
    const existing = await Candidate.collection.indexes();
    const oldEmailIdx = existing.find(
      (i: { name?: string; unique?: boolean }) => i.name === "email_1" && i.unique
    );
    if (oldEmailIdx) {
      console.log("[import] Dropping legacy unique email index...");
      await Candidate.collection.dropIndex("email_1");
    }
    await Candidate.syncIndexes();
    console.log("[import] Indexes synced.\n");
  } catch (err) {
    console.warn("[import] Index sync warning:", err);
  }

  const grandTotals = {
    files: 0,
    rows: 0,
    created: 0,
    updated: 0,
    skippedNoEmail: 0,
    errors: 0,
    multiTagMerges: 0,
  };

  for (const plan of PLANS) {
    const full = path.join(SHEETS_DIR, plan.file);
    if (!fs.existsSync(full)) {
      console.warn(`[SKIP] file not found: ${plan.file}`);
      continue;
    }

    console.log("━".repeat(60));
    console.log(`📄 ${plan.file}`);
    console.log(`   tag: ${plan.tag} | nameSplit: ${plan.nameSplit}`);

    const { rows, headers } = parseCsvFile(full, plan.skipLines);
    console.log(`   rows: ${rows.length} | headers: ${headers.length}`);

    // Warn about unmapped columns
    const unmapped = headers.filter((h) => !(h in plan.mapping));
    if (unmapped.length > 0) {
      console.log(`   unmapped columns: ${JSON.stringify(unmapped)}`);
    }

    const batchId = randomUUID();
    let created = 0;
    let updated = 0;
    let skippedNoEmail = 0;
    let errors = 0;
    let multiTagMerges = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const data = buildPayload(row, plan, batchId);

        // Need at least ONE identifying field (name / phone / idNumber / email)
        const hasIdentity =
          data.firstName || data.lastName || data.fullName || data.phone || data.idNumber || data.email;
        if (!hasIdentity) {
          errors++;
          continue;
        }

        if (data.noEmail) skippedNoEmail++;

        const filter = dupeFilter(data);
        const importEntry = {
          batchId,
          source: `csv:${plan.file}`,
          row,
          importedAt: new Date(),
        };

        if (filter) {
          const existing = await Candidate.findOne(filter);
          if (existing) {
            const setFields: Record<string, unknown> = {};
            const reserved = new Set([
              "tags",
              "noEmail",
              "rawPayload",
              "importBatchId",
              "source",
              "smooveSynced",
            ]);
            for (const [k, v] of Object.entries(data)) {
              if (reserved.has(k)) continue;
              const curr = (existing as unknown as Record<string, unknown>)[k];
              if (curr == null || curr === "" || (Array.isArray(curr) && curr.length === 0)) {
                setFields[k] = v;
              }
            }

            // If email was added to an existing contact that was noEmail → reset sync flag
            const emailAdded = !existing.email && data.email;
            if (emailAdded) {
              setFields.smooveSynced = false;
              setFields.noEmail = false;
            }

            // Track multi-tag merges (existing has tags but not this one)
            const existingTags = (existing.tags as string[] | undefined) ?? [];
            if (existingTags.length > 0 && !existingTags.includes(plan.tag)) {
              multiTagMerges++;
            }

            await Candidate.updateOne(
              { _id: existing._id },
              {
                $set: setFields,
                $addToSet: { tags: plan.tag },
                $push: { "rawPayload.imports": importEntry },
              }
            );
            updated++;
            continue;
          }
        }

        await Candidate.create({
          ...data,
          rawPayload: { imports: [importEntry] },
        });
        created++;
      } catch (err) {
        errors++;
        console.error(`   row ${i + 2} error:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(
      `   ✓ ${created} created, ${updated} updated, ${skippedNoEmail} no-email, ${errors} errors, ${multiTagMerges} multi-tag merges`
    );

    grandTotals.files++;
    grandTotals.rows += rows.length;
    grandTotals.created += created;
    grandTotals.updated += updated;
    grandTotals.skippedNoEmail += skippedNoEmail;
    grandTotals.errors += errors;
    grandTotals.multiTagMerges += multiTagMerges;
  }

  console.log("\n" + "━".repeat(60));
  console.log("📊 IMPORT SUMMARY");
  console.log(`   files: ${grandTotals.files}`);
  console.log(`   rows:  ${grandTotals.rows}`);
  console.log(`   created: ${grandTotals.created}`);
  console.log(`   updated: ${grandTotals.updated}`);
  console.log(`   no-email (kept in DB, not in Smoove): ${grandTotals.skippedNoEmail}`);
  console.log(`   multi-tag merges (same person across sheets): ${grandTotals.multiTagMerges}`);
  console.log(`   errors:  ${grandTotals.errors}`);
  console.log("━".repeat(60));

  // Smoove sync
  const pending = await Candidate.find({
    email: { $exists: true, $ne: "" },
    smooveSynced: { $ne: true },
  }).lean();

  console.log(`\n🔄 Smoove sync — ${pending.length} candidates with email need syncing`);

  if (pending.length === 0) {
    console.log("   nothing to sync.");
    await mongoose.disconnect();
    return;
  }

  const defaultListId = process.env.SMOOVE_DEFAULT_LIST_ID
    ? Number(process.env.SMOOVE_DEFAULT_LIST_ID)
    : undefined;
  console.log(`   Smoove list id: ${defaultListId ?? "(not configured)"}\n`);

  let synced = 0;
  let failed = 0;
  let limitHit = false;

  for (let i = 0; i < pending.length; i += 100) {
    const batch = pending.slice(i, i + 100);
    const contacts = batch.map((c) => ({
      email: c.email!,
      firstName: c.firstName,
      lastName: c.lastName,
      cellPhone: c.phone,
    }));

    console.log(`   batch ${Math.floor(i / 100) + 1}: ${contacts.length} contacts...`);
    const result = await bulkImportContacts(contacts, defaultListId);
    console.log(`      → ${JSON.stringify({ success: result.success, error: result.error })}`);

    if (result.success) {
      synced += batch.length;
      await Candidate.updateMany(
        { _id: { $in: batch.map((c) => c._id) } },
        { $set: { smooveSynced: true, smooveSyncedAt: new Date(), smooveError: undefined } }
      );
    } else {
      failed += batch.length;
      await Candidate.updateMany(
        { _id: { $in: batch.map((c) => c._id) } },
        { $set: { smooveSynced: false, smooveError: result.error } }
      );
      if (result.limitExceeded) {
        limitHit = true;
        console.log("\n   ⚠️  Smoove free-tier limit hit — stopping Smoove sync.");
        console.log("   All candidates remain in DB and can be synced later");
        console.log("   by calling POST /api/candidates/sync-smoove (or upgrade plan).");
        break;
      }
    }
  }

  console.log("\n" + "━".repeat(60));
  console.log("🔔 SMOOVE SUMMARY");
  console.log(`   attempted: ${pending.length}`);
  console.log(`   synced:    ${synced}`);
  console.log(`   failed:    ${failed}`);
  console.log(`   limit hit: ${limitHit ? "YES (free tier — 100 contacts)" : "no"}`);
  console.log("━".repeat(60));

  await mongoose.disconnect();
  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
