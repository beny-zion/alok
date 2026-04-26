"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, UserPlus, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { jobFormSchema, type JobFormValues } from "@/lib/validators";
import { JOB_TYPES } from "@/lib/constants";
import { FreeCombobox } from "@/components/ui/free-combobox";
import {
  createJob,
  updateJob,
  deleteJob,
  getJob,
  getJobFilters,
  type JobListingData,
  type JobStatus,
  type SubmissionData,
} from "@/lib/api";
import { JobStatusPill } from "./job-status-pill";
import { JobSubmissionsBoard } from "./job-submissions-board";
import { CandidatePickerDialog } from "./candidate-picker-dialog";

interface JobEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: JobListingData | null;
  onSaved: (updated?: JobListingData) => void;
  onDeleted?: () => void;
}

const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "טיוטה",
  open: "פתוחה",
  filled: "נסגרה (מאוישת)",
  closed: "סגורה",
};

const PAYMENT_SCHEDULE_LABELS: Record<"one-installment" | "two-installments", string> = {
  "one-installment": "פעימה אחת",
  "two-installments": "שתי פעימות",
};

const PAYMENT_DAYS_LABELS: Record<30 | 90, string> = {
  30: "30 יום",
  90: "90 יום",
};

export function JobEditSheet({
  open,
  onOpenChange,
  job,
  onSaved,
  onDeleted,
}: JobEditSheetProps) {
  const isEdit = !!job;
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sectorOptions, setSectorOptions] = useState<string[]>([]);
  const [workAreaOptions, setWorkAreaOptions] = useState<string[]>([]);
  const [permanenceOptions, setPermanenceOptions] = useState<string[]>([]);
  const [wpSectors, setWpSectors] = useState<string[]>([]);
  const [wpWorkAreas, setWpWorkAreas] = useState<string[]>([]);
  const [wpJobScopes, setWpJobScopes] = useState<string[]>([]);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: getDefaults(job),
  });

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setActiveTab("details");
    form.reset(getDefaults(job));
    if (job?._id) loadSubmissions(job._id);
    else setSubmissions([]);
    // Merge static constants with whatever sectors/areas already exist in the DB
    // so the user always sees what's already in use plus the freedom to add new ones.
    getJobFilters().then((res) => {
      if (res.success && res.data) {
        // Filters API already merges WP taxonomies with DB-distinct values,
        // so res.data.sectors / workAreas / jobPermanences are the canonical lists.
        setSectorOptions(res.data.sectors);
        setWorkAreaOptions(res.data.workAreas);
        setPermanenceOptions(res.data.jobPermanences);
        setWpSectors(res.data.wpSectors ?? []);
        setWpWorkAreas(res.data.wpWorkAreas ?? []);
        setWpJobScopes(res.data.wpJobScopes ?? []);
      }
    });
  }, [open, job, form]);

  const loadSubmissions = async (jobId: string) => {
    const res = await getJob(jobId);
    if (res.success && res.data) setSubmissions(res.data.submissions || []);
  };

  const onSubmit = async (values: JobFormValues) => {
    setSubmitting(true);
    try {
      // Send salary as a string — the server parses it. Sending a number breaks Zod validation.
      const res = isEdit
        ? await updateJob(job!._id, values as Record<string, unknown>)
        : await createJob(values as Record<string, unknown>);
      if (res.success) {
        toast.success(isEdit ? "המשרה עודכנה" : "המשרה נוספה");
        onSaved(res.data);
        if (!isEdit) onOpenChange(false);
        else if (res.data?._id) loadSubmissions(res.data._id);
      } else {
        toast.error(res.error || "שגיאה בשמירה");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteJob(job._id);
      if (res.success) {
        toast.success("המשרה נמחקה");
        onOpenChange(false);
        onDeleted?.();
      } else {
        toast.error(res.error || "שגיאה במחיקה");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const title = useMemo(() => {
    if (!job) return "הוספת משרה חדשה";
    return job.title || job.companyName || "משרה";
  }, [job]);

  const existingCandidateIds = submissions
    .map((s) => (typeof s.candidateId === "object" ? s.candidateId._id : s.candidateId))
    .filter(Boolean) as string[];

  const errors = form.formState.errors;
  const watchedUrgent = form.watch("urgent");
  const watchedPublicVisible = form.watch("publicVisible");
  const watchedStatus = form.watch("status") as JobStatus | undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="sm:max-w-[760px] p-0">
          <div className="flex flex-col h-full">
            <SheetHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle>{title}</SheetTitle>
                {job && <JobStatusPill status={job.status} urgent={job.urgent} />}
                {job && job.placementsCount != null && job.placementsCount > 0 && (
                  <span className="text-[10px] text-emerald-700">
                    {job.placementsCount} השמות
                  </span>
                )}
              </div>
              <SheetDescription>
                {isEdit
                  ? "ערוך פרטי משרה, צרף מועמדים ועדכן שלבי השמה."
                  : "הוספת משרה חדשה ידנית. ניתן לפרסם לאתר הציבורי לאחר השמירה."}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(typeof v === "string" && v ? v : "details")}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <div className="px-5 pt-3 border-b">
                  <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="details">פרטי משרה</TabsTrigger>
                    <TabsTrigger value="description">תיאור ודרישות</TabsTrigger>
                    {isEdit && (
                      <TabsTrigger value="submissions">
                        מועמדים מצורפים
                        {submissions.length > 0 && (
                          <span className="mr-1 bg-[#1B1464] text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center">
                            {submissions.length}
                          </span>
                        )}
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="publishing">הגדרות פרסום</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <TabsContent value="details" keepMounted>
                    <div className="space-y-5">
                      <PublicSection
                        title="מוצג באתר הציבורי"
                        subtitle="השדות האלה מסונכרנים לוורדפרס ונראים למחפשי עבודה"
                      >
                        <Grid>
                          <Field
                            label="כותרת המשרה *"
                            error={errors.title?.message}
                            badge="public"
                          >
                            <Input {...form.register("title")} placeholder="דרושות טלפניות" />
                          </Field>
                          <Field label="מספר משרה" badge="public">
                            <Input dir="ltr" {...form.register("jobNumber")} placeholder="#52" />
                          </Field>
                          <Field label="תחום" badge="public">
                            <Controller
                              name="sector"
                              control={form.control}
                              render={({ field }) => (
                                <FreeCombobox
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  options={sectorOptions}
                                  placeholder="בחר או הוסף תחום חדש"
                                />
                              )}
                            />
                            <NewTermHint
                              value={form.watch("sector")}
                              wpList={wpSectors}
                              taxonomyLabel="תחומי משרות"
                            />
                          </Field>
                          <Field label="אזור" badge="public">
                            <Controller
                              name="workArea"
                              control={form.control}
                              render={({ field }) => (
                                <FreeCombobox
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  options={workAreaOptions}
                                  placeholder="בחר או הוסף אזור חדש"
                                />
                              )}
                            />
                            <NewTermHint
                              value={form.watch("workArea")}
                              wpList={wpWorkAreas}
                              taxonomyLabel="מקומות עבודה"
                            />
                          </Field>
                          <Field label="היקף משרה" badge="public">
                            <Controller
                              name="jobPermanence"
                              control={form.control}
                              render={({ field }) => (
                                <FreeCombobox
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  options={permanenceOptions}
                                  placeholder="משרה מלאה / חלקית / זמנית..."
                                />
                              )}
                            />
                            <NewTermHint
                              value={form.watch("jobPermanence")}
                              wpList={wpJobScopes}
                              taxonomyLabel="היקפי-משרה"
                            />
                          </Field>
                        </Grid>
                      </PublicSection>

                      <InternalSection
                        title="פנימי בלבד"
                        subtitle="לא מוצג באתר. נשמר במערכת לשימוש פנימי"
                      >
                        <Grid>
                          <Field label="שם חברה *" error={errors.companyName?.message}>
                            <Input {...form.register("companyName")} />
                          </Field>
                          <Field label="טלפון חברה">
                            <Input dir="ltr" {...form.register("companyPhone")} />
                          </Field>
                          <Field label="היקף נוסף (לא מסונכרן)">
                            <Controller
                              name="jobType"
                              control={form.control}
                              render={({ field }) => (
                                <NullableSelect
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  options={[...JOB_TYPES]}
                                  placeholder="בחר"
                                />
                              )}
                            />
                          </Field>
                          <Field label="שכר">
                            <Input
                              dir="ltr"
                              type="number"
                              {...form.register("salary")}
                              placeholder="20000"
                            />
                          </Field>
                          <Field label="שעות / משמרת">
                            <Input {...form.register("workHours")} placeholder="08:00-17:00" />
                          </Field>
                        </Grid>

                        <div className="border-t pt-3 mt-3">
                          <h4 className="text-xs font-semibold text-gray-600 mb-2">איש קשר במעסיק</h4>
                          <Grid>
                            <Field label="שם פרטי">
                              <Input {...form.register("contactName")} />
                            </Field>
                            <Field label="שם משפחה">
                              <Input {...form.register("contactLastName")} />
                            </Field>
                            <Field label="טלפון">
                              <Input dir="ltr" {...form.register("contactPhone")} />
                            </Field>
                            <Field label="אימייל" error={errors.contactEmail?.message}>
                              <Input dir="ltr" type="email" {...form.register("contactEmail")} />
                            </Field>
                          </Grid>
                        </div>
                      </InternalSection>
                    </div>
                  </TabsContent>

                  <TabsContent value="description" keepMounted>
                    <PublicSection
                      title="מוצג באתר הציבורי"
                      subtitle='הטקסט הזה נשמר בשדה "תוכן משרה" בוורדפרס ומופיע בעמוד המשרה'
                    >
                      <Field label="תיאור התפקיד והדרישות" badge="public">
                        <Textarea
                          rows={14}
                          {...form.register("description")}
                          placeholder="תיאור המשרה, דרישות, הטבות..."
                          className="text-sm"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          ניתן להזין HTML בסיסי (תגיות p, br, strong, ul, li).
                        </p>
                      </Field>
                    </PublicSection>
                  </TabsContent>

                  {isEdit && (
                    <TabsContent value="submissions" keepMounted>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">
                            {submissions.length > 0
                              ? `${submissions.length} מועמדים`
                              : "אין מועמדים מצורפים"}
                          </h3>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setPickerOpen(true)}
                            className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-1.5"
                          >
                            <UserPlus className="size-3.5" />
                            צרף מועמדים
                          </Button>
                        </div>
                        <JobSubmissionsBoard
                          submissions={submissions}
                          onChanged={() => job && loadSubmissions(job._id)}
                        />
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="publishing" keepMounted>
                    <div className="space-y-4">
                      <Field label="סטטוס המשרה">
                        <Controller
                          name="status"
                          control={form.control}
                          render={({ field }) => (
                            <Select
                              value={field.value || "open"}
                              onValueChange={(v) => v && field.onChange(v as JobStatus)}
                            >
                              <SelectTrigger>
                                <SelectValue>
                                  {(v: unknown) =>
                                    STATUS_LABELS[v as JobStatus] ?? "—"
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">טיוטה</SelectItem>
                                <SelectItem value="open">פתוחה</SelectItem>
                                <SelectItem value="filled">נסגרה (מאוישת)</SelectItem>
                                <SelectItem value="closed">סגורה</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          {watchedStatus === "filled"
                            ? "תוצג עם קו חוצה באתר הציבורי כדי ליצור FOMO"
                            : watchedStatus === "draft" || watchedStatus === "closed"
                            ? "לא תוצג באתר הציבורי"
                            : "תוצג רגיל באתר הציבורי"}
                        </p>
                      </Field>

                      <ToggleField
                        label="פרסום באתר הציבורי"
                        description="המשרה תופיע ב-feed שאתר ה-WordPress צורך"
                        checked={!!watchedPublicVisible}
                        onChange={(v) => form.setValue("publicVisible", v)}
                      />

                      <ToggleField
                        label="משרה חמה / דחופה"
                        description="תוצג עם תג להבה כתום בראש הרשימה"
                        checked={!!watchedUrgent}
                        onChange={(v) => form.setValue("urgent", v)}
                      />

                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">תנאי גביה</h3>
                        <Grid>
                          <Field label="מבנה תשלום">
                            <Controller
                              name="paymentSchedule"
                              control={form.control}
                              render={({ field }) => (
                                <Select
                                  value={field.value || "two-installments"}
                                  onValueChange={(v) =>
                                    v && field.onChange(v as "one-installment" | "two-installments")
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue>
                                      {(v: unknown) =>
                                        PAYMENT_SCHEDULE_LABELS[
                                          v as "one-installment" | "two-installments"
                                        ] ?? "—"
                                      }
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="one-installment">פעימה אחת</SelectItem>
                                    <SelectItem value="two-installments">שתי פעימות</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </Field>
                          <Field label="פעימה ראשונה לאחר">
                            <Controller
                              name="firstPaymentDays"
                              control={form.control}
                              render={({ field }) => (
                                <Select
                                  value={String(field.value ?? 90)}
                                  onValueChange={(v) =>
                                    v && field.onChange(Number(v) as 30 | 90)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue>
                                      {(v: unknown) =>
                                        PAYMENT_DAYS_LABELS[Number(v) as 30 | 90] ?? "—"
                                      }
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="30">30 יום</SelectItem>
                                    <SelectItem value="90">90 יום</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </Field>
                        </Grid>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="border-t px-5 py-3 flex items-center justify-between gap-3 bg-gray-50/40">
                {isEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-600 hover:text-red-700 gap-1.5"
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    {confirmDelete ? "לחץ שוב לאישור" : "מחק משרה"}
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    ביטול
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-1.5"
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    {isEdit ? "שמור שינויים" : "הוסף משרה"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {isEdit && job && (
        <CandidatePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          jobId={job._id}
          existingCandidateIds={existingCandidateIds}
          onAdded={() => loadSubmissions(job._id)}
        />
      )}
    </>
  );
}

function getDefaults(job?: JobListingData | null): JobFormValues {
  if (!job) {
    return {
      title: "",
      description: "",
      jobNumber: "",
      companyName: "",
      companyPhone: "",
      sector: "",
      workArea: "",
      jobType: "",
      jobPermanence: "",
      salary: "",
      workDays: [],
      workHours: "",
      contactName: "",
      contactLastName: "",
      contactPhone: "",
      contactEmail: "",
      urgent: false,
      status: "open",
      publicVisible: false,
      paymentSchedule: "two-installments",
      firstPaymentDays: 90,
    };
  }
  return {
    title: job.title ?? "",
    description: job.description ?? "",
    jobNumber: job.jobNumber ?? "",
    companyName: job.companyName ?? "",
    companyPhone: job.companyPhone ?? "",
    sector: job.sector ?? "",
    workArea: job.workArea ?? "",
    jobType: job.jobType ?? "",
    jobPermanence: job.jobPermanence ?? "",
    salary: job.salary != null ? String(job.salary) : "",
    workDays: job.workDays ?? [],
    workHours: job.workHours ?? "",
    contactName: job.contactName ?? "",
    contactLastName: job.contactLastName ?? "",
    contactPhone: job.contactPhone ?? "",
    contactEmail: job.contactEmail ?? "",
    urgent: job.urgent ?? false,
    status: job.status ?? "open",
    publicVisible: job.publicVisible ?? false,
    paymentSchedule: job.paymentSchedule ?? "two-installments",
    firstPaymentDays: (job.firstPaymentDays as 30 | 90) ?? 90,
  };
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  error,
  children,
  badge,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  badge?: "public" | "internal";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        {badge === "public" && (
          <span title="מוצג באתר" className="text-emerald-600">
            <Globe className="size-3" />
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PublicSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Globe className="size-4 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-emerald-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-emerald-700/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function InternalSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
      <div className="flex items-start gap-2 mb-3">
        <Lock className="size-4 text-gray-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// Warns when a free-add value will create a NEW term in the WP taxonomy.
function NewTermHint({
  value,
  wpList,
  taxonomyLabel,
}: {
  value?: string;
  wpList: string[];
  taxonomyLabel: string;
}) {
  if (!value) return null;
  const exists = wpList.some((w) => w.toLowerCase() === value.toLowerCase());
  if (exists || wpList.length === 0) return null;
  return (
    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
      ⚠️ ערך חדש — ייווצר term חדש בטקסונומיה &quot;{taxonomyLabel}&quot; בוורדפרס
    </p>
  );
}

function NullableSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(!v || v === "none" ? "" : String(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {(v: unknown) => (!v || v === "none" ? "—" : String(v))}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        className="mt-0.5"
      />
      <div
        className="flex-1 cursor-pointer"
        onClick={() => onChange(!checked)}
      >
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>
    </div>
  );
}
