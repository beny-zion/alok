import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/candidate.model";
import { bulkImportContacts } from "@/lib/smoove";
import { normalizePhone } from "@/lib/phone";

export const maxDuration = 60;

const CANDIDATE_FIELDS = [
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "city",
  "address",
  "sectors",
  "age",
  "gender",
  "idNumber",
  "status",
  "statusNotes",
  "registrationDate",
  "cvUrl",
  "jobType",
  "salaryExpectation",
  "placedJob",
  "placedCompany",
  "additionalInfo",
  "freeText",
] as const;

type CandidateField = (typeof CANDIDATE_FIELDS)[number];

type NameSplit = "first-space" | "lastname-only" | "firstname-only" | "fullname-only";

interface ImportRowError {
  row: number;
  reason: string;
}

function splitName(
  firstRaw: string | undefined,
  lastRaw: string | undefined,
  fullRaw: string | undefined,
  strategy: NameSplit
) {
  const out: { firstName?: string; lastName?: string; fullName?: string } = {};
  if (firstRaw) out.firstName = firstRaw;
  if (lastRaw) out.lastName = lastRaw;
  if (fullRaw) out.fullName = fullRaw;

  if (strategy === "first-space" && fullRaw && !firstRaw && !lastRaw) {
    const trimmed = fullRaw.trim();
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx === -1) {
      out.firstName = trimmed;
    } else {
      out.firstName = trimmed.slice(0, spaceIdx);
      out.lastName = trimmed.slice(spaceIdx + 1);
    }
  } else if (strategy === "lastname-only" && fullRaw && !lastRaw) {
    out.lastName = fullRaw.trim();
  } else if (strategy === "firstname-only" && fullRaw && !firstRaw) {
    out.firstName = fullRaw.trim();
  }
  // "fullname-only" keeps fullName as-is
  return out;
}

function parseRegistrationDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  // DD/MM/YYYY or DD/MM/YY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const yearRaw = m[3];
    const year = yearRaw
      ? yearRaw.length === 2
        ? 2000 + Number(yearRaw)
        : Number(yearRaw)
      : new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function buildCandidatePayload(
  row: Record<string, string>,
  mapping: Record<string, CandidateField | "ignore">,
  nameSplit: NameSplit,
  tag: string,
  defaultRegistrationDate: Date | undefined,
  batchId: string
) {
  const data: Record<string, unknown> = {};

  for (const [csvCol, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    const raw = row[csvCol];
    if (raw == null || String(raw).trim() === "") continue;
    const val = String(raw).trim();

    if (field === "sectors") {
      data.sectors = val
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (field === "age" || field === "salaryExpectation") {
      const n = Number(val);
      if (!isNaN(n)) data[field] = n;
    } else if (field === "registrationDate") {
      const d = parseRegistrationDate(val);
      if (d) data.registrationDate = d;
    } else if (field === "phone") {
      const norm = normalizePhone(val);
      if (norm) data.phone = norm;
    } else if (field === "email") {
      const trimmed = val.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) data.email = trimmed;
    } else {
      data[field] = val;
    }
  }

  // Name splitting
  const name = splitName(
    data.firstName as string | undefined,
    data.lastName as string | undefined,
    data.fullName as string | undefined,
    nameSplit
  );
  Object.assign(data, name);

  if (!data.registrationDate && defaultRegistrationDate) {
    data.registrationDate = defaultRegistrationDate;
  }

  data.noEmail = !data.email;
  data.tags = [tag];
  data.importBatchId = batchId;
  data.source = "csv-import";

  return data;
}

function findDuplicateFilter(data: Record<string, unknown>) {
  if (data.email) return { email: data.email };
  if (data.idNumber) return { idNumber: data.idNumber };
  if (data.phone) return { phone: data.phone };
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const mappingRaw = form.get("mapping") as string | null;
    const tag = (form.get("tag") as string | null)?.trim() || "";
    const nameSplit = (form.get("nameSplit") as string | null) || "first-space";
    const defaultDateRaw = form.get("defaultDate") as string | null;

    if (!file) return NextResponse.json({ success: false, error: "חסר קובץ" }, { status: 400 });
    if (!mappingRaw)
      return NextResponse.json({ success: false, error: "חסר מיפוי עמודות" }, { status: 400 });
    if (!tag) return NextResponse.json({ success: false, error: "חסר תגית" }, { status: 400 });

    const mapping = JSON.parse(mappingRaw) as Record<string, CandidateField | "ignore">;
    const defaultRegistrationDate = parseRegistrationDate(defaultDateRaw || undefined);

    const text = await file.text();
    // Strip BOM that Google Sheets writes
    const cleanText = text.replace(/^\uFEFF/, "");

    const parsed = Papa.parse<Record<string, string>>(cleanText, {
      header: true,
      skipEmptyLines: "greedy",
    });

    if (parsed.errors.length > 0) {
      console.error("[Import] papaparse errors:", parsed.errors.slice(0, 5));
    }

    const rows = parsed.data.filter((r) =>
      Object.values(r).some((v) => v && String(v).trim() !== "")
    );

    const batchId = randomUUID();
    await connectDB();

    let created = 0;
    let updated = 0;
    let skippedNoEmail = 0;
    const errors: ImportRowError[] = [];
    const toSyncToSmoove: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      cellPhone?: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const data = buildCandidatePayload(
          row,
          mapping,
          nameSplit as NameSplit,
          tag,
          defaultRegistrationDate,
          batchId
        );

        if (!data.firstName && !data.lastName && !data.fullName) {
          errors.push({ row: i + 2, reason: "חסר שם" });
          continue;
        }

        if (data.noEmail) skippedNoEmail++;

        const dupFilter = findDuplicateFilter(data);
        const importEntry = {
          batchId,
          source: "csv-import",
          row,
          importedAt: new Date(),
        };

        if (dupFilter) {
          const existing = await Candidate.findOne(dupFilter);
          if (existing) {
            const setFields: Record<string, unknown> = {};
            const reserved = new Set([
              "tags",
              "noEmail",
              "rawPayload",
              "importBatchId",
              "source",
            ]);
            for (const [k, v] of Object.entries(data)) {
              if (reserved.has(k)) continue;
              const curr = (existing as unknown as Record<string, unknown>)[k];
              if (curr == null || curr === "" || (Array.isArray(curr) && curr.length === 0)) {
                setFields[k] = v;
              }
            }
            await Candidate.updateOne(
              { _id: existing._id },
              {
                $set: setFields,
                $addToSet: { tags: tag },
                $push: { "rawPayload.imports": importEntry },
              }
            );
            updated++;
            if (existing.email || data.email) {
              const email = (existing.email as string) || (data.email as string);
              if (email) {
                toSyncToSmoove.push({
                  email,
                  firstName: (data.firstName as string) || existing.firstName,
                  lastName: (data.lastName as string) || existing.lastName,
                  cellPhone: (data.phone as string) || existing.phone,
                });
              }
            }
            continue;
          }
        }

        const payload = {
          ...data,
          rawPayload: { imports: [importEntry] },
        };
        const candidate = await Candidate.create(payload);
        created++;
        if (candidate.email) {
          toSyncToSmoove.push({
            email: candidate.email,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            cellPhone: candidate.phone,
          });
        }
      } catch (err) {
        console.error(`[Import] row ${i + 2} failed:`, err);
        errors.push({
          row: i + 2,
          reason: err instanceof Error ? err.message : "שגיאה לא ידועה",
        });
      }
    }

    // Sync to Smoove in batches of 500 — blocking so we can report result,
    // but tolerant: on limit error we stop Smoove sync and continue.
    let smooveSynced = 0;
    let smooveFailed = 0;
    let smooveLimitHit = false;
    let smooveError: string | undefined;

    if (toSyncToSmoove.length > 0) {
      const defaultListId = process.env.SMOOVE_DEFAULT_LIST_ID
        ? Number(process.env.SMOOVE_DEFAULT_LIST_ID)
        : undefined;

      for (let i = 0; i < toSyncToSmoove.length; i += 500) {
        const batch = toSyncToSmoove.slice(i, i + 500);
        const result = await bulkImportContacts(batch, defaultListId);
        if (result.success) {
          smooveSynced += batch.length;
          await Candidate.updateMany(
            { email: { $in: batch.map((c) => c.email) } },
            { $set: { smooveSynced: true, smooveSyncedAt: new Date(), smooveError: undefined } }
          );
        } else {
          smooveFailed += batch.length;
          smooveError = result.error;
          await Candidate.updateMany(
            { email: { $in: batch.map((c) => c.email) } },
            { $set: { smooveSynced: false, smooveError: result.error } }
          );
          if (result.limitExceeded) {
            smooveLimitHit = true;
            console.warn("[Import] Smoove limit exceeded — stopping sync:", result.error);
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: rows.length,
        created,
        updated,
        skippedNoEmail,
        errors,
        batchId,
        smooveSynced,
        smooveFailed,
        smooveLimitHit,
        smooveError,
      },
    });
  } catch (error) {
    console.error("[Import] error:", error);
    return NextResponse.json(
      { success: false, error: "שגיאה בייבוא: " + (error instanceof Error ? error.message : "") },
      { status: 500 }
    );
  }
}
