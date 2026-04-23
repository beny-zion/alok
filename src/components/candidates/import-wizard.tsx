"use client";

import { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FreeMultiCombobox } from "@/components/ui/free-multi-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";
import { importCandidates, type ImportResult } from "@/lib/api";
import { toast } from "sonner";

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
  | "salaryExpectation"
  | "placedJob"
  | "placedCompany"
  | "additionalInfo"
  | "freeText"
  | "ignore";

const FIELD_LABELS: Record<CandidateField, string> = {
  firstName: "שם פרטי",
  lastName: "שם משפחה",
  fullName: "שם מלא (לא מפוצל)",
  email: "מייל",
  phone: "טלפון",
  city: "עיר",
  address: "כתובת",
  sectors: "תחומים",
  age: "גיל",
  gender: "מין",
  idNumber: "ת.ז.",
  status: "סטטוס",
  statusNotes: "הערות סטטוס",
  registrationDate: "תאריך רישום",
  cvUrl: "קורות חיים",
  jobType: "סוג משרה",
  salaryExpectation: "ציפיות שכר",
  placedJob: "משרה שסגר",
  placedCompany: "חברה שסגרה",
  additionalInfo: "מידע נוסף",
  freeText: "טקסט חופשי",
  ignore: "[התעלם]",
};

type NameSplit = "first-space" | "lastname-only" | "firstname-only" | "fullname-only";

function autoDetect(header: string): CandidateField {
  const h = header.toLowerCase().trim();
  if (!h) return "ignore";
  if (h.includes("שם פרטי") || h === "first" || h.includes("first name") || h.includes("firstname")) return "firstName";
  if (h.includes("שם משפחה") || h === "last" || h.includes("last name") || h.includes("lastname")) return "lastName";
  if (h === "שם" || h.includes("שם מלא") || h === "name") return "fullName";
  if (h.includes("מייל") || h.includes("אימייל") || h.includes("email") || h.includes("mail")) return "email";
  if (h.includes("נייד") || h.includes("טלפון") || h.includes("phone") || h.includes("tel")) return "phone";
  if (h.includes("עיר") || h.includes("כתובת") || h.includes("city") || h.includes("address")) return "city";
  if (h.includes("ת.ז") || h.includes("תז") || h.includes("ת\"ז") || h === "id" || h.includes("id number")) return "idNumber";
  if (h.includes("מגדר") || h === "מין" || h.includes("gender") || h.includes("sex")) return "gender";
  if (h.includes("קורות חיים") || h.includes("קו\"ח") || h.includes("cv") || h.includes("resume")) return "cvUrl";
  if (
    h.includes("סטטוס") ||
    h.includes("התקבלה") ||
    h.includes("מעדכן") ||
    h.includes("האם חרדי") ||
    h.includes("מעונינת") ||
    h.includes("מעוניינת להמשיך") ||
    h === "status"
  ) return "status";
  if (h.includes("קטגורי") || h.includes("תחום") || h.includes("מקצוע") || h.includes("sector")) return "sectors";
  if (h.includes("תאריך רישום") || h.includes("תאריך התקשרות") || h.includes("תאריך")) return "registrationDate";
  if (h === "גיל" || h === "age") return "age";
  if (h.includes("סוג משרה") || h.includes("היקף")) return "jobType";
  if (h.includes("שכר") || h.includes("salary")) return "salaryExpectation";
  if (h.includes("משרה שסגר")) return "placedJob";
  if (h.includes("חברה שסגר")) return "placedCompany";
  if (h.includes("תיאור") || h.includes("הערות")) return "additionalInfo";
  return "ignore";
}

export function ImportWizard({ existingTags }: { existingTags: string[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, CandidateField>>({});
  const [tag, setTag] = useState<string>("");
  const [nameSplit, setNameSplit] = useState<NameSplit>("first-space");
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    f.text().then((text) => {
      const clean = text.replace(/^\uFEFF/, "");
      const parsed = Papa.parse<Record<string, string>>(clean, {
        header: true,
        skipEmptyLines: "greedy",
      });
      const rows = parsed.data.filter((r) =>
        Object.values(r).some((v) => v && String(v).trim() !== "")
      );
      const hdrs = parsed.meta.fields || [];
      setHeaders(hdrs);
      setPreviewRows(rows.slice(0, 5));
      setTotalRows(rows.length);
      const auto: Record<string, CandidateField> = {};
      hdrs.forEach((h) => {
        auto[h] = autoDetect(h);
      });
      setMapping(auto);
    });
  };

  const stats = useMemo(() => {
    const hasEmailCol = Object.values(mapping).includes("email");
    const hasEmailInPreview = hasEmailCol
      ? previewRows.filter((r) => {
          const emailCol = Object.entries(mapping).find(([, f]) => f === "email")?.[0];
          return emailCol && r[emailCol] && r[emailCol].trim();
        }).length
      : 0;
    return { hasEmail: hasEmailInPreview, previewTotal: previewRows.length };
  }, [mapping, previewRows]);

  const canProceedFrom1 = !!file && headers.length > 0;
  const canProceedFrom2 = !!tag.trim();
  const canProceedFrom3 = Object.values(mapping).some((f) => f !== "ignore");

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mapping", JSON.stringify(mapping));
      form.append("tag", tag.trim());
      form.append("nameSplit", nameSplit);
      if (defaultDate) form.append("defaultDate", defaultDate);

      const res = await importCandidates(form);
      if (res.success && res.data) {
        setResult(res.data);
        toast.success(`${res.data.created} חדשים, ${res.data.updated} עודכנו`);
        setStep(4);
      } else {
        toast.error(res.error || "שגיאה בייבוא");
      }
    } catch (err) {
      toast.error("שגיאה בייבוא: " + (err instanceof Error ? err.message : ""));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-[#1B1464] mb-1">ייבוא מועמדים מ-CSV</h1>
        <p className="text-sm text-gray-500">
          העלה קובץ CSV, מפה את העמודות, ותן תגית לקבוצת המועמדים.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-5">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  s === step
                    ? "bg-[#1B1464] text-white"
                    : s < step
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {s < step ? <CheckCircle2 className="size-4" /> : s}
              </div>
              {s < 4 && <div className={`h-0.5 flex-1 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <span className="flex-1">העלאה</span>
          <span className="flex-1 text-center">הגדרות</span>
          <span className="flex-1 text-center">מיפוי</span>
          <span className="flex-1 text-left">ביצוע</span>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-[#1B1464] transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
          >
            <Upload className="size-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">לחץ לבחירת קובץ או גרור לכאן</p>
            <p className="text-xs text-gray-500 mt-1">פורמט: CSV בלבד</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>

          {file && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center gap-3">
              <FileText className="size-5 text-[#1B1464]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {totalRows} שורות, {headers.length} עמודות
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-xs text-blue-900">
            <strong>איך להוריד מ-Google Sheets:</strong> File → Download → Comma-separated values
            (.csv). אם יש כמה גיליונות, הורד כל אחד בנפרד וייבא בנפרד עם תגית אחרת.
          </div>

          <div className="flex justify-end mt-6">
            <Button
              className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-2"
              disabled={!canProceedFrom1}
              onClick={() => setStep(2)}
            >
              המשך
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div>
            <Label className="text-sm mb-2 block">
              תגית לקבוצה <span className="text-red-500">*</span>
            </Label>
            <FreeMultiCombobox
              value={tag ? [tag] : []}
              onChange={(v) => setTag(v[v.length - 1] || "")}
              options={existingTags}
              placeholder="למשל: aerospace-women, tomer-interview, main-list"
              addLabel="הוסף תגית חדשה"
            />
            <p className="text-xs text-gray-500 mt-1">
              תגית אחת לכל הקובץ. מאפשרת לסנן את הקבוצה בהמשך.
            </p>
          </div>

          <div>
            <Label className="text-sm mb-2 block">אסטרטגיית פיצול שם</Label>
            <Select value={nameSplit} onValueChange={(v) => setNameSplit(v as NameSplit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first-space">פיצול בספייס ראשון (מומלץ): &quot;מויאל מרדכי&quot; → מויאל + מרדכי</SelectItem>
                <SelectItem value="lastname-only">הכל כשם משפחה בלבד</SelectItem>
                <SelectItem value="firstname-only">הכל כשם פרטי בלבד</SelectItem>
                <SelectItem value="fullname-only">שמירה כשם מלא, בלי פיצול</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              רלוונטי רק אם יש עמודת &quot;שם מלא&quot; בלי פיצול.
            </p>
          </div>

          <div>
            <Label className="text-sm mb-2 block">תאריך רישום ברירת מחדל (אופציונלי)</Label>
            <Input
              type="date"
              value={defaultDate}
              onChange={(e) => setDefaultDate(e.target.value)}
              dir="ltr"
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              ישמש רק למועמדים שאין להם תאריך בשורה.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowRight className="size-4 ml-1" />
              חזרה
            </Button>
            <Button
              className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-2"
              disabled={!canProceedFrom2}
              onClick={() => setStep(3)}
            >
              המשך
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-[#1B1464] mb-3">
              מפה את העמודות ({totalRows} שורות, {headers.length} עמודות)
            </h3>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {headers.map((h) => (
                      <TableHead key={h} className="min-w-[180px]">
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500 truncate" title={h}>
                            {h || <em>(ללא כותרת)</em>}
                          </div>
                          <Select
                            value={mapping[h] || "ignore"}
                            onValueChange={(v) =>
                              setMapping((prev) => ({ ...prev, [h]: v as CandidateField }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(FIELD_LABELS) as CandidateField[]).map((f) => (
                                <SelectItem key={f} value={f} className="text-xs">
                                  {FIELD_LABELS[f]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (
                        <TableCell key={h} className="text-xs text-gray-700 max-w-[180px] truncate">
                          {row[h] || <span className="text-gray-300">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              מציג 5 שורות ראשונות. זיהוי אוטומטי בוצע לפי כותרות; תוכל לשנות מיפוי ידנית.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-blue-900 font-medium">תגית</div>
              <div className="text-blue-700">{tag}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-900 font-medium">פיצול שם</div>
              <div className="text-gray-700">
                {nameSplit === "first-space" && "ספייס ראשון"}
                {nameSplit === "lastname-only" && "שם משפחה"}
                {nameSplit === "firstname-only" && "שם פרטי"}
                {nameSplit === "fullname-only" && "שם מלא"}
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-amber-900 font-medium">מייל ב-5 שורות</div>
              <div className="text-amber-700">
                {stats.hasEmail} מ-{stats.previewTotal}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)} disabled={importing}>
              <ArrowRight className="size-4 ml-1" />
              חזרה
            </Button>
            <Button
              className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-2"
              disabled={!canProceedFrom3 || importing}
              onClick={doImport}
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  מייבא...
                </>
              ) : (
                <>
                  בצע ייבוא
                  <ArrowLeft className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <CheckCircle2 className="size-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">הייבוא הסתיים</h3>
              <p className="text-xs text-gray-500">תגית: {tag}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-gray-900">{result.total}</div>
              <div className="text-xs text-gray-500">סך שורות</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-green-700">{result.created}</div>
              <div className="text-xs text-green-600">חדשים</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-blue-700">{result.updated}</div>
              <div className="text-xs text-blue-600">עודכנו (כפילויות)</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-amber-700">{result.skippedNoEmail}</div>
              <div className="text-xs text-amber-600">ללא מייל (ב-DB, לא ב-Smoove)</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50">
              <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                <AlertCircle className="size-4" />
                {result.errors.length} שגיאות
              </div>
              <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                {result.errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="text-red-600">
                    שורה {e.row}: {e.reason}
                  </div>
                ))}
                {result.errors.length > 50 && (
                  <div className="text-red-500">...ועוד {result.errors.length - 50}</div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setFile(null);
                setHeaders([]);
                setPreviewRows([]);
                setTag("");
                setResult(null);
                setMapping({});
              }}
            >
              ייבוא קובץ נוסף
            </Button>
            <a
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
            >
              <Badge className="bg-white/20 text-white">{tag}</Badge>
              עבור לרשימת מועמדים
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
