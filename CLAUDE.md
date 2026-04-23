# CLAUDE.md — Smart Lead Management & Mass Mailing System (Mini-CRM)

## Project Overview

A lightweight Candidate Management System (Mini ATS) and mailing platform for an employment agency.

**Problem:** The client collects leads via an Elementor form (WordPress) and manually sends emails via BCC.
**Solution:** Automate lead collection via Webhooks, store data in MongoDB, and provide a fast Admin Dashboard to filter candidates and send mass HTML emails via Smoove's bulk API.

---

## Brand Identity

### Logo
- **"AL"** — geometric modern logotype with connected A and L letters
- Tagline: "AL גיוס עובדים והשמה" (AL Recruitment & Placement)
- Two versions: dark (for light backgrounds), white (for dark backgrounds)
- Logo files on WP: `לוגו-אתר.png` (dark), `לוגו-לבן.png` (white)

### Color Palette
| CSS Variable           | Name            | Hex       | Usage                              |
|------------------------|-----------------|-----------|------------------------------------|
| `--color-primary`      | Deep Navy       | `#1B1464` | Main backgrounds, gradients        |
| `--color-primary-dark` | Dark Navy       | `#0D0B3E` | Cards, dark sections               |
| `--color-accent`       | Bright Orange   | `#F7941D` | Headings, highlights, CTAs, links  |
| `--color-secondary`    | Royal Blue      | `#2563EB` | Buttons, secondary cards, info     |
| `--color-white`        | White           | `#FFFFFF` | Text on dark bg, card backgrounds  |
| `--color-text`         | Dark Gray       | `#1F2937` | Body text on light backgrounds     |

### Design Principles
- RTL layout (Hebrew) — use `dir="rtl"` on root
- Clean, modern, professional look
- Orange for emphasis/action, blue for structure/info
- White outlined buttons on dark backgrounds
- Dashboard should feel clean and light (white bg) with navy/orange accents from the brand

---

## Architecture

**Single Next.js application deployed on Vercel.** No separate backend needed.

Smoove handles all mass email distribution — one API call sends to an entire list. No need for BullMQ, Redis, or a separate worker process.

```
Next.js (Vercel)
├── /app                → Admin Dashboard (React Server Components + Client Components)
├── /app/api            → API Routes (Webhook ingestion, Smoove integration, MongoDB queries)
├── MongoDB Atlas       → Candidate storage + campaign logs
└── Smoove API          → Mass email sending, contact management, campaign stats
```

### Why This Works

Smoove's API accepts HTML + a list of contacts and handles distribution internally:
- `POST /v1/Campaigns` — create & send a campaign to a list (one API call)
- `POST /v1/Contacts_BulkImport` — import up to 500 contacts per request
- `POST /v1/async/campaigns` — async campaign creation with status polling

A single Next.js API Route can call Smoove and return within Vercel's timeout. No long-running process needed.

---

## Technology Stack

| Concern            | Technology                          |
|--------------------|-------------------------------------|
| Framework          | Next.js (App Router)                |
| Language           | TypeScript (strict mode)            |
| Styling            | TailwindCSS                         |
| UI Components      | shadcn/ui                           |
| Forms & Validation | React Hook Form + Zod              |
| Rich Text Editor   | TipTap                              |
| Data Tables        | @tanstack/react-table + shadcn/ui   |
| Database           | MongoDB (Atlas, M0 Free Tier)       |
| ODM                | Mongoose                            |
| Mailing Service    | Smoove (REST API)                   |
| Hosting            | Vercel                              |

**Schema Strategy:** Use MongoDB's flexible schema to accommodate future Elementor form changes without migrations. Enforce strict types on core fields (Name, Email, Phone, Sector, Location) while storing the raw webhook payload flexibly.

---

## Smoove Integration

### API Reference: https://rest.smoove.io/

### Authentication
All requests require header: `Authorization: Bearer {API_KEY}`

### Key Endpoints Used

#### Contacts
```
POST   /v1/Contacts                  — Create/update single contact
POST   /v1/Contacts_BulkImport       — Import up to 500 contacts at once
GET    /v1/Contacts                   — List contacts (paginated, filterable)
GET    /v1/Contacts/{id}              — Get contact by ID/Email/Phone
POST   /v1/Contacts/{id}/Unsubscribe — Unsubscribe a contact
```

#### Lists
```
GET    /v1/Lists                      — Get all lists
POST   /v1/Lists                      — Create a new list
GET    /v1/Lists/{id}/Contacts        — Get contacts in a list
```

#### Campaigns
```
POST   /v1/Campaigns                  — Create campaign (subject, body HTML, toListsById, sendNow)
POST   /v1/Campaigns/{id}/Send        — Send existing campaign
GET    /v1/Campaigns/{id}/Statistics   — Get open/click/bounce stats
GET    /v1/Campaigns/{id}/Recipients   — Get per-recipient delivery status
POST   /v1/async/campaigns            — Async campaign creation
GET    /v1/async/campaigns/{uuid}/status — Poll async campaign status
```

### Campaign Sending Flow
```
1. Admin selects candidates + writes email in dashboard
2. API Route syncs selected candidates to a Smoove list (BulkImport)
3. API Route creates campaign: POST /v1/Campaigns { subject, body, toListsById, sendNow: true }
4. Smoove handles all sending, rate limiting, bounces, unsubscribes
5. Save campaign record in MongoDB for our audit trail
6. Stats available via GET /v1/Campaigns/{id}/Statistics
```

---

## Elementor Webhook Payloads

Two forms send webhooks. Both need to be ingested.

### Form A — Job Seekers ("איסוף לידים", form #10)

5-step form from the "מחפש עבודה" page.

#### Step 1 — Personal Details
| Field ID         | Label       | Type    | Example                        |
|------------------|-------------|---------|--------------------------------|
| `name`           | שם פרטי     | text    | בני                            |
| `field_9b4b058`  | שם משפחה    | text    | ציון                           |
| `field_55a80fb`  | גיל         | number  | 23                             |
| `field_0271f15`  | עיר מגורים  | select  | אשדוד                          |
| `field_5b06785`  | כתובת       | text    | Shlomo Ben Yosef St 23        |
| `field_8331320`  | טלפון       | tel     | 0504123190                     |
| `field_6c16bcf`  | אימייל      | email   | b415555@gmail.com              |
| `field_7e1d48a`  | מין         | select  | זכר / נקבה                     |

#### Step 2 — Job Preferences & Salary
| Field ID         | Label                  | Type       | Example / Notes                          |
|------------------|------------------------|------------|------------------------------------------|
| `field_760e340`  | באיזה תחום תרצו לעבוד  | checkboxes | Multiple sectors (see full list below)   |
| `mytext`         | טקסט חופשי             | textarea   | בדיקה                                    |
| `field_46111c1`  | סוג משרה (היקף)        | select     | משרה מלאה / משרה חלקית                   |
| `field_df823a4`  | סוג עבודה (קביעות)     | select     | עבודה קבועה / עבודה זמנית                |
| `field_b2c9d05`  | ציפיות שכר             | number     | 20000                                    |

#### Step 3 — Work Experience
| Field ID         | Label                              | Type       | Notes                    |
|------------------|------------------------------------|------------|--------------------------|
| `field_0ac03f5`  | האם כבר עבדתם בעבודה כלשהי בעבר?   | radio+text | כן/לא + פירוט בטקסט חופשי |
| —                | האם יש לכם הכשרה/ידע בתחום כלשהו?  | radio+text | כן/לא + פירוט בטקסט חופשי |

#### Step 4 — Languages
| Field ID         | Label              | Type       | Options                                         |
|------------------|--------------------|------------|-------------------------------------------------|
| `field_bf77361`  | שפת אם             | radio      | עברית / אנגלית / אידיש / אחר                    |
| `field_c4db162`  | שפות נוספות         | checkboxes | עברית, אנגלית, אידיש, צרפתית, רוסית, ספרדית     |

#### Step 5 — Additional Info
| Field ID         | Label                              | Type     | Example                                    |
|------------------|------------------------------------|----------|--------------------------------------------|
| `field_a8e8524`  | מידע נוסף שחשוב לכם לציין          | textarea | בדיקה בדיקה                                |
| —                | מספר משרה מהמאגר                    | number   | 52                                         |
| —                | קובץ קו"ח                          | file     | https://alok.co.il/.../69c001621346e.pdf   |

#### Sector Options (field_760e340) — Full List
```
UX UI, אדריכלות / עיצוב פנים, אחזקה ולוגיסטיקה, אינסטלציה, ביטוחים, בישול,
בניית אתרים, בנקאות, בנקאות ופיננסים, גינון וחקלאות, הייטק, הנדסת בניין,
הנה"ח ושכר, הפעלת מנוף, זגגות, חינוך והוראה, חינוך מיוחד, חשמלאות,
טכנאות מיזוג אוויר, טלמרקטינג, ייעוץ משכנתאות, כתיבת תוכן, מדיה ותקשורת,
מולטימדיה, מזכירות ושירותי משרד, מזכירות רפואית, מכירות, מערכות מידע,
משאבי אנוש, משק ותחזוקה, נגרות, נהג, ניהול, ניהול נכסים, ניקיון, סיעוד,
עו"ס, עובדי בניין, עורכות דין, עיצוב גרפי, פיתוח עסקי, פרסום ויח"צ,
קונדיטוריה, קופאי/ת, קלדנות, קלינאות תקשורת, ריפוי בעיסוק, ריתוך ומסגור,
רכש ולוגיסטיקה, רפואה, שיווק, שירות לקוחות, שליחויות, שמאות, תזונה,
תיווך ונדלן, תפירה ותדמיתנות, תרגום
```

#### Webhook Actions (already configured & working)
1. **אימייל** — sends email notification
2. **Webhook** — sends POST to configured URL
3. **פופאפ** — PopUp integration

---

### Form B — Employers ("טופס חדש", form #9e4ec72)

Single-step form from the "מעסיקים" page.

| Field ID         | Label                  | Type       | Example                  |
|------------------|------------------------|------------|--------------------------|
| `name`           | שם חברה                | text       | AL חברת השמה             |
| `field_7e1d48a`  | תחום/תפקיד             | text       | משרדית                   |
| —                | אזור העבודה             | select     | ירושלים                  |
| —                | סוג משרה (היקף)        | select     | משרה מלאה                |
| —                | סוג משרה (קביעות)      | select     | עבודה קבועה              |
| —                | שכר                    | number     | 21                       |
| —                | ימי עבודה              | checkboxes | א, ב, ג, ד, ה, ו       |
| —                | שעות עבודה/סוג משמרת   | text       | —                        |
| `field_fd824dd`  | ?                      | ?          | —                        |
| `field_7871574`  | שם איש קשר             | text       | AL חברת השמה             |
| `field_ad3e3ae`  | טלפון                  | tel        | 0533101050               |
| `field_a487cc7`  | אימייל                 | email      | al086102600@gmail.com    |
| `field_34ba21a`  | סוג?                   | select     | רגיל                     |

#### Webhook Actions
1. **אימייל** — sends email notification (working)

---

## Data Models (Mongoose Schemas)

### Candidate (Job Seeker — from Form A, manual entry, or CSV import)
```typescript
{
  // Identity — all optional to accommodate incomplete CSV imports
  firstName?: string;
  lastName?: string;
  fullName?: string;           // fallback when source has single "name" column
  email?: string;              // optional, indexed sparse (was: required+unique)
  phone?: string;              // normalized via lib/phone.ts, indexed sparse
  noEmail?: boolean;           // explicit flag — skip Smoove sync if true
  idNumber?: string;           // ת.ז. / passport, indexed sparse

  age?: number;
  gender?: string;             // "זכר" | "נקבה"
  city?: string;
  address?: string;

  sectors: string[];           // flexible list — combobox with free-add
  jobType?: string;
  jobPermanence?: string;
  salaryExpectation?: number;

  freeText?: string;
  motherTongue?: string;
  additionalLanguages?: string[];
  hasWorkExperience?: boolean;
  workExperienceDetails?: string;
  hasTraining?: boolean;
  trainingDetails?: string;
  additionalInfo?: string;
  additionalNotes?: string;
  jobListingNumber?: number;
  cvUrl?: string;

  // Status tracking (from main list CSV)
  status?: string;             // "נשלח לרעיון" | "לא טופל" | "עודכן" | "לא ענה" | "התחיל עבודה" | …
  statusNotes?: string;
  registrationDate?: Date;

  // Placement (when a candidate was placed in a job)
  placedJob?: string;
  placedCompany?: string;
  firstPaymentDate?: Date;
  secondPaymentDate?: Date;

  // Tag system — classifies candidate source/group (aerospace-women, tomer-interview, main-list…)
  tags: string[];              // indexed, shown in filters, used in campaign targeting

  // Import tracking
  importBatchId?: string;      // UUID — groups candidates from the same import run

  // Smoove sync tracking
  smooveContactId?: number;
  smooveSynced?: boolean;      // indexed — if false, needs push to Smoove
  smooveSyncedAt?: Date;
  smooveError?: string;        // last sync error (e.g. "Authentication failed")

  // Raw history — accumulates every source that touched this record
  rawPayload: {
    webhook?: object;          // Elementor webhook payload (if source was webhook)
    imports?: Array<{          // every CSV import that created/updated this record
      batchId: string;
      source: string;          // e.g. "csv:תעשיה אוירית 2 - גיליון1.csv"
      row: object;             // original CSV row
      importedAt: Date;
    }>;
  };
  source: string;              // "elementor-webhook" | "manual" | "csv-import"
  createdAt: Date;
  updatedAt: Date;
}
```

**Uniqueness strategy:** during upsert (import, webhook, manual), identity is resolved in priority order:
1. `email` (if present)
2. `idNumber` (if present)
3. `phone` (normalized, if present)
4. Otherwise → new record

**When a duplicate is found during import:** only empty/null fields are filled in (`$set`), new tag is added (`$addToSet`), and the raw import row is pushed to `rawPayload.imports[]` for full history.

### JobListing (Employer — from Form B)
```typescript
{
  companyName: string;         // from: name
  sector: string;              // from: field_7e1d48a
  workArea?: string;           // אזור העבודה
  jobType?: string;            // משרה מלאה / חלקית
  jobPermanence?: string;      // עבודה קבועה / זמנית
  salary?: number;             // שכר
  workDays?: string[];         // ימי עבודה
  workHours?: string;          // שעות עבודה / סוג משמרת
  contactName?: string;        // from: field_7871574
  contactPhone?: string;       // from: field_ad3e3ae
  contactEmail?: string;       // from: field_a487cc7 — indexed
  rawPayload: object;          // full Elementor webhook payload
  source: string;              // default: "elementor-webhook"
  createdAt: Date;
  updatedAt: Date;
}
```

### Campaign
```typescript
{
  subject: string;             // email subject line
  htmlContent: string;         // rich HTML email body
  status: enum;                // "draft" | "sent" | "failed"
  smooveCampaignId?: number;   // Smoove's internal campaign ID
  recipientCount: number;      // how many candidates were targeted
  candidateIds: ObjectId[];    // references to selected candidates
  filters?: object;            // snapshot of filters used at send time
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Routes (Next.js `/app/api`)

### Webhooks
```
POST   /api/webhook/candidate        — Receive job seeker form submissions (Form A)
POST   /api/webhook/employer         — Receive employer form submissions (Form B)
```

### Candidates
```
GET    /api/candidates                — List candidates (paginated, filterable)
         ?page=1&limit=20&city=אשדוד&sector=בישול&tag=aerospace-women&search=…
POST   /api/candidates                — Manual add (validates identity, syncs to Smoove)
GET    /api/candidates/:id            — Get single candidate
PUT    /api/candidates/:id            — Update (resets smooveSynced if email was added)
DELETE /api/candidates/:id            — Delete + unsubscribe from Smoove
GET    /api/candidates/filters        — Distinct values for filters: cities, sectors, tags, statuses
GET    /api/candidates/ids            — All matching IDs (for "Select All across filter")
POST   /api/candidates/import         — Bulk CSV import with column mapping + tag
POST   /api/candidates/sync-smoove    — Retry Smoove sync for candidates with smooveSynced=false
GET    /api/candidates/sync-smoove    — Count of candidates pending Smoove sync
```

### Campaigns
```
POST   /api/campaigns               — Sync contacts to Smoove list + create & send campaign
         Body: { subject, htmlContent, candidateIds[] }
         Response: { success, data: campaign, skippedNoEmail }
GET    /api/campaigns               — List campaigns from MongoDB
GET    /api/campaigns/:id           — Get campaign details
GET    /api/campaigns/:id/stats     — Fetch live stats from Smoove API
```

### Health
```
GET    /api/health                  — Health check (MongoDB connectivity)
```

---

## Implementation Status

### ✅ Done

**Ingestion:**
- Elementor webhook → [src/app/api/webhook/candidate/route.ts](src/app/api/webhook/candidate/route.ts). Parses bracket-notation URL-encoded body, maps field IDs to candidate fields, upserts by email (or creates new if no email), tracks Smoove sync result.
- Manual add via dashboard → [src/app/api/candidates/route.ts](src/app/api/candidates/route.ts) (POST). Form: [src/components/candidates/candidate-form-dialog.tsx](src/components/candidates/candidate-form-dialog.tsx) — covers ALL candidate fields (identity, status, placement, experience, training, tags, sectors via free combobox).
- CSV bulk import → [src/app/import/page.tsx](src/app/import/page.tsx) + [src/components/candidates/import-wizard.tsx](src/components/candidates/import-wizard.tsx). 4-step wizard: upload → settings (tag + name-split strategy + default date) → column mapping with auto-detect → execute + summary. Backend: [src/app/api/candidates/import/route.ts](src/app/api/candidates/import/route.ts). Uses `papaparse`, strips BOM, handles DD/MM/YYYY dates.
- CLI import script → [scripts/import-all.ts](scripts/import-all.ts). Runs all 6 CSVs in `./Sheets/` sequentially with pre-configured mappings. Report per file + grand totals.

**Dashboard:**
- Candidate table → [src/components/candidates/candidate-table.tsx](src/components/candidates/candidate-table.tsx). Paginated, server-side filtered (city, sector, gender, jobType, tag, full-text search). Per-row "no email" indicator, "Select All across filter" button.
- Filters → [src/components/candidates/candidate-filters.tsx](src/components/candidates/candidate-filters.tsx). Sector/tag dropdowns populated dynamically from `Candidate.distinct()` via [src/app/api/candidates/filters/route.ts](src/app/api/candidates/filters/route.ts) — new values auto-appear.
- Free multi-combobox → [src/components/ui/free-multi-combobox.tsx](src/components/ui/free-multi-combobox.tsx). Type-to-add, used for sectors and tags.
- Compose campaign → [src/app/compose/page.tsx](src/app/compose/page.tsx). TipTap editor, merge tags (`{{firstName}}` → `[[First Name]]`), live HTML preview with branded wrapper.

**Campaign execution:**
- `POST /api/campaigns` → [src/app/api/campaigns/route.ts](src/app/api/campaigns/route.ts). Filters out no-email candidates (returns `skippedNoEmail`), bulk-imports in batches of 500, creates Smoove campaign via `toMembersByEmail` (only selected, not entire list).
- Campaign list + stats → [src/app/campaigns/page.tsx](src/app/campaigns/page.tsx), live stats via Smoove Statistics API.

**Smoove sync tracking:**
- Every candidate carries `smooveSynced` / `smooveSyncedAt` / `smooveError`.
- When a candidate gets an email added via PUT ([src/app/api/candidates/[id]/route.ts](src/app/api/candidates/[id]/route.ts)), `smooveSynced` resets to `false` automatically.
- Retry endpoint: `POST /api/candidates/sync-smoove` pushes pending candidates (email + !smooveSynced) in batches of 100. Stops gracefully on free-tier limit (HTTP 402/403 or "limit exceeded" messages detected in [src/lib/smoove.ts](src/lib/smoove.ts) `isLimitError`).

**Data integrity tools:**
- [scripts/check-db.ts](scripts/check-db.ts) — snapshot of DB state (total, by tag, Smoove sync status).
- [scripts/verify-import.ts](scripts/verify-import.ts) — spot-check 15 random candidates vs original CSV rows + detect duplicates (by phone / idNumber / email / name+city).

### ⚠️ Known issues

- **Smoove `401 Authentication failed`** — the API key in `.env.local` is rejected. All 212 sync attempts failed on last run. Regenerate key in Smoove Dashboard → Settings → API, update `SMOOVE_API_KEY`, then run the sync-smoove endpoint.
- **Smoove free tier = 100 contacts** — the `limitExceeded` detection is in place, but we haven't hit it in production yet (because auth is failing first). When resolved, the sync-smoove endpoint will stop cleanly at 100.
- **16 phone-level duplicates + 1 idNumber duplicate** detected in DB (see `verify-import.ts` output). These snuck in because early imports stored records before the phone/idNumber dedup keys were normalized. They need a manual merge tool (see "Next Steps").

### 🚧 Next steps / missing features

- **Duplicate merge UI** — `/admin/merge` page to review detected duplicate groups (`verify-import.ts` output) and merge interactively. Should combine tags, rawPayload.imports[], keep best non-empty values per field.
- **Webhook field-ID verification** — the `FIELD_MAP` in [src/app/api/webhook/candidate/route.ts](src/app/api/webhook/candidate/route.ts) was copied from CLAUDE.md. Needs smoke test: submit a real form on the live site and confirm all fields arrive correctly.
- **Fix pre-existing lint errors** — 13 errors in [src/components/candidates/candidate-table.tsx](src/components/candidates/candidate-table.tsx) (setState-in-effect) and [src/components/campaigns/tiptap-editor.tsx](src/components/campaigns/tiptap-editor.tsx) (Cannot create components during render). They don't block build but will accumulate.
- **Auth** — no authentication on any admin route. MVP assumption is internal tool. Before exposing, add at least basic auth or NextAuth.
- **CV file handling** — `cvUrl` is just a string now. WordPress-side uploads work, but admin-uploaded CVs for CSV-imported candidates need an upload endpoint.
- **Bounce/unsubscribe feedback loop** — Smoove tracks bounces/unsubs but we don't pull them back. Need a scheduled job (`GET /v1/Contacts/{id}/Status`) to flag bounced emails in our DB.
- **Delete by tag / bulk ops** — currently only individual delete. Helpful for cleaning up test imports.

---

## Code Conventions

### General
- TypeScript strict mode
- Zod schemas for all validation (API inputs, webhook payloads, form data)
- All API responses follow: `{ success: boolean, data?: T, error?: string }`
- Use `async/await`, never raw `.then()` chains
- Environment variables via `.env.local` (never committed)

### Next.js
- Use App Router (`/app` directory) — no Pages Router
- Server Components by default, `"use client"` only when needed
- All forms use React Hook Form + Zod resolver
- shadcn/ui components — do not install alternative UI libraries
- No `any` types — always define proper TypeScript interfaces
- API calls from client components go through `lib/api.ts`

### Folder Structure

```
app/
├── layout.tsx
├── page.tsx                        # Dashboard home / candidate table
├── campaigns/
│   └── page.tsx                    # Campaign list + stats
├── compose/
│   └── page.tsx                    # Compose new campaign
└── api/
    ├── webhook/
    │   └── elementor/route.ts      # Elementor webhook handler
    ├── candidates/
    │   ├── route.ts                # GET list, POST (manual add)
    │   └── [id]/route.ts           # GET one, DELETE
    ├── campaigns/
    │   ├── route.ts                # GET list, POST (create & send)
    │   └── [id]/
    │       ├── route.ts            # GET details
    │       └── stats/route.ts      # GET live stats from Smoove
    └── health/route.ts

components/
├── ui/                             # shadcn/ui components
├── candidates/
│   ├── candidate-table.tsx
│   ├── candidate-filters.tsx
│   └── candidate-columns.tsx
└── campaigns/
    ├── compose-form.tsx
    └── campaign-list.tsx

lib/
├── db.ts                           # MongoDB/Mongoose connection
├── smoove.ts                       # Smoove API client wrapper
├── api.ts                          # Frontend API client
├── utils.ts
└── validators.ts                   # Zod schemas

models/
├── candidate.model.ts
└── campaign.model.ts

types/
└── index.ts
```

---

## Environment Variables (`.env.local`)

```
MONGODB_URI=mongodb+srv://...@cluster.mongodb.net/minicrm
SMOOVE_API_KEY=your-smoove-api-key
SMOOVE_API_URL=https://rest.smoove.io/v1
SMOOVE_DEFAULT_LIST_ID=list-id-for-campaigns
WEBHOOK_SECRET=optional-secret-for-elementor
```

---

## Key Implementation Notes

1. **Smoove Sync Strategy:** When sending a campaign, bulk-import the selected candidates into a dedicated Smoove list, then create a campaign targeting that list. This keeps Smoove lists in sync with our filtered selections.

2. **Webhook Idempotency:** Use candidate email as a unique key. On duplicate, update the existing record (upsert).

3. **Pagination:** API returns `{ success: true, data: { candidates: Candidate[], total: number, page: number, totalPages: number } }`.

4. **Select All:** "Select All" applies to the current filtered set, not the entire database. Frontend passes filter criteria to the API Route, which queries MongoDB and collects all matching IDs.

5. **Campaign Audit:** Save every campaign in MongoDB with: subject, HTML content, candidate IDs, filter snapshot, smooveCampaignId. This creates a local audit trail independent of Smoove.

6. **Security:**
   - Webhook endpoint optionally validates a shared secret header from Elementor
   - No authentication for MVP (internal tool), but structure middleware to add auth later
   - Sanitize HTML content before storing (prevent XSS in email previews)

7. **Smoove Rate Limits:** BulkImport supports 500 contacts per request. For larger lists, chunk into batches of 500 sequentially within the API Route. This stays well within Vercel timeout.

8. **Error Handling:**
   - If Smoove API fails, save campaign as "failed" with error details
   - Webhook returns 201/400/409 — never expose internal errors to Elementor

---

## Commands

```bash
npm install
npm run dev          # Start dev server on :3000
npm run build        # Production build
npm run lint         # ESLint

# Admin scripts (require .env.local with MONGODB_URI)
npx tsx scripts/import-all.ts     # Bulk-import every CSV in ./Sheets/ with pre-configured mappings
npx tsx scripts/check-db.ts       # Print DB snapshot: totals by tag + Smoove sync status
npx tsx scripts/verify-import.ts  # Spot-check 15 random candidates vs source CSV + detect duplicates
```

### Source data (`./Sheets/`)

Six CSVs from the client's Google Drive, each with its own schema:

| file | rows | tag assigned | notes |
|------|------|---|---|
| `עותק של AL - 11 באפריל… מחפשי עבודה.csv` | 8986 (1174 real) | `main-list` | 3 blank header rows — set `skipLines: 3`. Most rows have only phone, no name. Rich fields: status, placed job, placed company |
| `הרשמה לתעשיה אוירית - בנות.csv` | 25 | `aerospace-women` | Single `שם` column — needs `nameSplit: "first-space"` |
| `הרשמה לתעשיה אוירית - גיליון1.csv` | 44 | `aerospace-men` | Same as above, מעדכן column used for status |
| `תעשיה אוירית 2 - גיליון1.csv` (+ copy) | 21 | `aerospace-2` | File 5 and 6 are identical — re-running is safe (upsert merges) |
| `קבוצה לסיור וראיון בתומר - גיליון1.csv` | 79 | `tomer-interview` | Status tracking: עודכן / לא ענה / לא מעוניין |

Last import result (see [scripts/verify-import.ts](scripts/verify-import.ts) output):
- **881 candidates** in DB (212 with email, 669 without)
- **44 cross-sheet merges** (same person in ≥2 sheets)
- **Spot-check: 47/47 fields match** source CSV rows ✅

### Environment

When editing webhook field mappings, the source of truth for Elementor field IDs is the "Elementor Webhook Payloads" section above. The DB schema is **flexible by design** — `rawPayload.webhook` stores the full unparsed body so schema changes from Elementor can be recovered retroactively.
