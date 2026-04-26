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
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FreeMultiCombobox } from "@/components/ui/free-multi-combobox";
import { FreeCombobox } from "@/components/ui/free-combobox";
import { CVUploader } from "@/components/candidates/cv-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { candidateFormSchema, type CandidateFormValues } from "@/lib/validators";
import { CITIES, GENDERS, JOB_TYPES, JOB_PERMANENCE, LANGUAGES } from "@/lib/constants";
import {
  createCandidate,
  updateCandidate,
  deleteCandidate,
  getFilterOptions,
  syncCandidateToSmoove,
  type CandidateData,
} from "@/lib/api";
import { toast } from "sonner";

interface CandidateEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: CandidateData | null;
  onSaved: (updated?: CandidateData) => void;
  onDeleted?: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  "elementor-webhook": "טופס אלמנטור",
  "csv-import": "ייבוא CSV",
  manual: "יצירה ידנית",
};

export function CandidateEditSheet({
  open,
  onOpenChange,
  candidate,
  onSaved,
  onDeleted,
}: CandidateEditSheetProps) {
  const isEdit = !!candidate;
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sectorOptions, setSectorOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("personal");

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setActiveTab("personal");
    getFilterOptions().then((res) => {
      if (res.success && res.data) {
        setSectorOptions(res.data.sectors || []);
        setTagOptions(res.data.tags || []);
      }
    });
  }, [open]);

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: getDefaults(candidate),
  });

  useEffect(() => {
    if (open) form.reset(getDefaults(candidate));
  }, [open, candidate, form]);

  const { errors } = form.formState;
  const watchedSectors = form.watch("sectors") ?? [];
  const watchedLanguages = form.watch("additionalLanguages") ?? [];
  const watchedTags = form.watch("tags") ?? [];

  const onSubmit = async (values: CandidateFormValues) => {
    setSubmitting(true);
    try {
      const cleaned: Record<string, unknown> = {
        ...values,
        age: toNumberOrUndef(values.age),
        salaryExpectation: toNumberOrUndef(values.salaryExpectation),
        jobListingNumber: toNumberOrUndef(values.jobListingNumber),
      };
      if (values.registrationDate)
        cleaned.registrationDate = new Date(values.registrationDate).toISOString();
      if (values.firstPaymentDate)
        cleaned.firstPaymentDate = new Date(values.firstPaymentDate).toISOString();
      if (values.secondPaymentDate)
        cleaned.secondPaymentDate = new Date(values.secondPaymentDate).toISOString();

      const res = isEdit
        ? await updateCandidate(candidate!._id, cleaned)
        : await createCandidate(cleaned);

      if (res.success) {
        toast.success(isEdit ? "המועמד עודכן בהצלחה" : "המועמד נוסף בהצלחה");
        onSaved(res.data);
        onOpenChange(false);
      } else {
        toast.error(res.error || "שגיאה בשמירה");
      }
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (!candidate) return;
    setSyncing(true);
    try {
      const res = await syncCandidateToSmoove(candidate._id);
      if (res.success) {
        toast.success("המועמד סונכרן ל-Smoove");
        onSaved();
      } else {
        toast.error(res.error || "סנכרון נכשל");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteCandidate(candidate._id);
      if (res.success) {
        toast.success("המועמד נמחק");
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
    if (!candidate) return "הוספת מועמד";
    const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
      candidate.fullName || candidate.email || candidate.phone || "מועמד";
    return name;
  }, [candidate]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="sm:max-w-[720px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <SheetTitle>{title}</SheetTitle>
              {candidate?.source && (
                <Badge variant="outline" className="text-[10px]">
                  {SOURCE_LABELS[candidate.source] || candidate.source}
                </Badge>
              )}
              {candidate && <SmooveStatusBadge c={candidate} />}
            </div>
            <SheetDescription>
              {isEdit
                ? "ערוך כל שדה. עריכה של שם/טלפון/מייל תסונכרן אוטומטית ל-Smoove."
                : "הזן פרטי מועמד חדש. הוא יסונכרן ל-Smoove אם יש מייל."}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(typeof v === "string" && v ? v : "personal")}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <div className="px-5 pt-3 border-b">
                <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="personal">אישי</TabsTrigger>
                  <TabsTrigger value="location">מיקום</TabsTrigger>
                  <TabsTrigger value="job">משרה</TabsTrigger>
                  <TabsTrigger value="exp">ניסיון ושפות</TabsTrigger>
                  <TabsTrigger value="status">סטטוס והשמה</TabsTrigger>
                  <TabsTrigger value="notes">הערות וקישורים</TabsTrigger>
                  {isEdit && <TabsTrigger value="meta">Meta</TabsTrigger>}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <TabsContent value="personal">
                  <Section>
                    <Grid>
                      <Field label="שם פרטי" error={errors.firstName?.message}>
                        <Input {...form.register("firstName")} />
                      </Field>
                      <Field label="שם משפחה" error={errors.lastName?.message}>
                        <Input {...form.register("lastName")} />
                      </Field>
                      <Field label="שם מלא (fallback)">
                        <Input {...form.register("fullName")} />
                      </Field>
                      <Field label="ת.ז. / דרכון">
                        <Input dir="ltr" {...form.register("idNumber")} />
                      </Field>
                      <Field label="אימייל" error={errors.email?.message}>
                        <Input type="email" dir="ltr" {...form.register("email")} />
                      </Field>
                      <Field label="טלפון" error={errors.phone?.message}>
                        <Input type="tel" dir="ltr" {...form.register("phone")} />
                      </Field>
                      <Field label="גיל">
                        <Input type="number" {...form.register("age")} />
                      </Field>
                      <Field label="מין">
                        <Controller
                          name="gender"
                          control={form.control}
                          render={({ field }) => (
                            <NullableSelect
                              value={field.value}
                              onChange={field.onChange}
                              options={[...GENDERS]}
                              placeholder="בחר"
                            />
                          )}
                        />
                      </Field>
                    </Grid>
                  </Section>
                </TabsContent>

                <TabsContent value="location">
                  <Section>
                    <Grid>
                      <Field label="עיר">
                        <Controller
                          name="city"
                          control={form.control}
                          render={({ field }) => (
                            <FreeCombobox
                              value={field.value}
                              onChange={field.onChange}
                              options={CITIES}
                              placeholder="בחר עיר או הקלד עיר חדשה"
                              addLabel="הוסף עיר"
                              emptyLabel="אין ערים"
                            />
                          )}
                        />
                      </Field>
                      <Field label="כתובת">
                        <Input {...form.register("address")} />
                      </Field>
                    </Grid>
                  </Section>
                </TabsContent>

                <TabsContent value="job">
                  <Section>
                    <Grid>
                      <Field label="סוג משרה">
                        <Controller
                          name="jobType"
                          control={form.control}
                          render={({ field }) => (
                            <NullableSelect
                              value={field.value}
                              onChange={field.onChange}
                              options={[...JOB_TYPES]}
                              placeholder="בחר"
                            />
                          )}
                        />
                      </Field>
                      <Field label="קביעות">
                        <Controller
                          name="jobPermanence"
                          control={form.control}
                          render={({ field }) => (
                            <NullableSelect
                              value={field.value}
                              onChange={field.onChange}
                              options={[...JOB_PERMANENCE]}
                              placeholder="בחר"
                            />
                          )}
                        />
                      </Field>
                      <Field label="ציפיות שכר">
                        <Input type="number" dir="ltr" {...form.register("salaryExpectation")} />
                      </Field>
                      <Field label="מספר משרה">
                        <Input type="number" dir="ltr" {...form.register("jobListingNumber")} />
                      </Field>
                    </Grid>

                    <div className="space-y-1.5 mt-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">תחומים</Label>
                        {watchedSectors.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {watchedSectors.length} נבחרו
                          </Badge>
                        )}
                      </div>
                      <Controller
                        name="sectors"
                        control={form.control}
                        render={({ field }) => (
                          <FreeMultiCombobox
                            value={field.value || []}
                            onChange={field.onChange}
                            options={sectorOptions}
                            placeholder="בחר תחומים..."
                            addLabel="הוסף תחום"
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-1.5 mt-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">תגיות (מקור / קבוצה)</Label>
                        {watchedTags.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {watchedTags.length} נבחרו
                          </Badge>
                        )}
                      </div>
                      <Controller
                        name="tags"
                        control={form.control}
                        render={({ field }) => (
                          <FreeMultiCombobox
                            value={field.value || []}
                            onChange={field.onChange}
                            options={tagOptions}
                            placeholder="הוסף תגית..."
                            addLabel="הוסף תגית"
                          />
                        )}
                      />
                    </div>
                  </Section>
                </TabsContent>

                <TabsContent value="exp">
                  <Section>
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <Controller
                          name="hasWorkExperience"
                          control={form.control}
                          render={({ field }) => (
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={(v) => field.onChange(!!v)}
                              className="mt-0.5"
                            />
                          )}
                        />
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-medium">יש ניסיון תעסוקתי</Label>
                          <Textarea
                            rows={2}
                            placeholder="פירוט הניסיון..."
                            {...form.register("workExperienceDetails")}
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <Controller
                          name="hasTraining"
                          control={form.control}
                          render={({ field }) => (
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={(v) => field.onChange(!!v)}
                              className="mt-0.5"
                            />
                          )}
                        />
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-medium">יש הכשרה / לימודים</Label>
                          <Textarea
                            rows={2}
                            placeholder="פירוט ההכשרה..."
                            {...form.register("trainingDetails")}
                          />
                        </div>
                      </div>

                      <Grid>
                        <Field label="שפת אם">
                          <Controller
                            name="motherTongue"
                            control={form.control}
                            render={({ field }) => (
                              <NullableSelect
                                value={field.value}
                                onChange={field.onChange}
                                options={[...LANGUAGES]}
                                placeholder="בחר"
                              />
                            )}
                          />
                        </Field>
                        <Field label="טקסט שפות (חופשי)">
                          <Input {...form.register("additionalLanguagesText")} />
                        </Field>
                      </Grid>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">שפות נוספות</Label>
                          {watchedLanguages.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {watchedLanguages.length} נבחרו
                            </Badge>
                          )}
                        </div>
                        <Controller
                          name="additionalLanguages"
                          control={form.control}
                          render={({ field }) => (
                            <FreeMultiCombobox
                              value={field.value || []}
                              onChange={field.onChange}
                              options={[...LANGUAGES]}
                              placeholder="בחר / הוסף שפה..."
                              addLabel="הוסף שפה"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </Section>
                </TabsContent>

                <TabsContent value="status">
                  <Section>
                    <Grid>
                      <Field label="סטטוס">
                        <Input placeholder="בעיבוד / נשלח לראיון / התקבלה..." {...form.register("status")} />
                      </Field>
                      <Field label="הערות סטטוס">
                        <Input {...form.register("statusNotes")} />
                      </Field>
                      <Field label="תאריך רישום">
                        <Input type="date" dir="ltr" {...form.register("registrationDate")} />
                      </Field>
                      <div />
                      <Field label="משרה שסגרה">
                        <Input {...form.register("placedJob")} />
                      </Field>
                      <Field label="חברה שסגרה">
                        <Input {...form.register("placedCompany")} />
                      </Field>
                      <Field label="תשלום ראשון">
                        <Input type="date" dir="ltr" {...form.register("firstPaymentDate")} />
                      </Field>
                      <Field label="תשלום שני">
                        <Input type="date" dir="ltr" {...form.register("secondPaymentDate")} />
                      </Field>
                    </Grid>
                  </Section>
                </TabsContent>

                <TabsContent value="notes">
                  <Section>
                    <div className="space-y-4">
                      <Field label="טקסט חופשי">
                        <Textarea rows={3} {...form.register("freeText")} />
                      </Field>
                      <Field label="הערות נוספות (additionalInfo)">
                        <Textarea rows={3} {...form.register("additionalInfo")} />
                      </Field>
                      <Field label="הערות מערכת (additionalNotes)">
                        <Textarea rows={2} {...form.register("additionalNotes")} />
                      </Field>
                      <Field label="קורות חיים">
                        <Controller
                          name="cvUrl"
                          control={form.control}
                          render={({ field }) => (
                            <CVUploader
                              value={field.value || ""}
                              onChange={field.onChange}
                              candidateId={candidate?._id}
                            />
                          )}
                        />
                      </Field>
                    </div>
                  </Section>
                </TabsContent>

                {isEdit && candidate && (
                  <TabsContent value="meta">
                    <Section>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <MetaRow label="מזהה MongoDB" value={candidate._id} dir="ltr" />
                        <MetaRow label="מקור" value={SOURCE_LABELS[candidate.source || ""] || candidate.source} />
                        <MetaRow label="נוצר" value={fmtDate(candidate.createdAt)} />
                        <MetaRow label="עודכן" value={fmtDate(candidate.updatedAt)} />
                        <MetaRow
                          label="Smoove Contact ID"
                          value={candidate.smooveContactId ? String(candidate.smooveContactId) : "—"}
                          dir="ltr"
                        />
                        <MetaRow
                          label="סונכרן לאחרונה"
                          value={candidate.smooveSyncedAt ? fmtDate(candidate.smooveSyncedAt) : "—"}
                        />
                        <MetaRow label="Batch ID" value={candidate.importBatchId || "—"} dir="ltr" />
                        <MetaRow
                          label="noEmail"
                          value={candidate.noEmail ? "כן" : "לא"}
                        />
                      </dl>
                      {candidate.smooveError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <span className="font-semibold">שגיאת Smoove: </span>
                          {candidate.smooveError}
                        </div>
                      )}
                    </Section>
                  </TabsContent>
                )}
              </div>
            </Tabs>

            <SheetFooter>
              <div className="flex items-center gap-2 flex-1">
                {isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    onBlur={() => setConfirmDelete(false)}
                    disabled={deleting || submitting}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    {deleting ? "מוחק..." : confirmDelete ? "אישור מחיקה" : "מחק"}
                  </Button>
                )}
                {isEdit && candidate?.email && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing || submitting}
                    className="gap-1.5"
                  >
                    {syncing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {syncing ? "מסנכרן..." : "סנכרן ל-Smoove"}
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
                disabled={submitting}
              >
                {submitting ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף מועמד"}
              </Button>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SmooveStatusBadge({ c }: { c: CandidateData }) {
  if (!c.email) {
    return (
      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 gap-1">
        ללא מייל
      </Badge>
    );
  }
  if (c.smooveError) {
    return (
      <Badge variant="outline" className="text-[10px] text-red-700 border-red-200 gap-1">
        <AlertTriangle className="size-3" />
        שגיאת Smoove
      </Badge>
    );
  }
  if (c.smooveSynced) {
    return (
      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="size-3" />
        סונכרן
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 gap-1">
      <Clock className="size-3" />
      ממתין לסנכרון
    </Badge>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function MetaRow({ label, value, dir }: { label: string; value?: string | number; dir?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-gray-900 break-all" dir={dir}>{value ?? "—"}</dd>
    </div>
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
        <SelectValue placeholder={placeholder} />
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

function toNumberOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function fmtDate(d?: string | Date) {
  if (!d) return "—";
  return new Date(d).toLocaleString("he-IL");
}

function getDefaults(candidate?: CandidateData | null): CandidateFormValues {
  if (!candidate) {
    return {
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      phone: "",
      age: "",
      gender: "",
      city: "",
      address: "",
      sectors: [],
      jobType: "",
      jobPermanence: "",
      salaryExpectation: "",
      freeText: "",
      additionalInfo: "",
      additionalNotes: "",
      motherTongue: "",
      additionalLanguages: [],
      additionalLanguagesText: "",
      tags: [],
      idNumber: "",
      status: "",
      statusNotes: "",
      registrationDate: "",
      cvUrl: "",
      placedJob: "",
      placedCompany: "",
      firstPaymentDate: "",
      secondPaymentDate: "",
      workExperienceDetails: "",
      trainingDetails: "",
      hasWorkExperience: false,
      hasTraining: false,
      jobListingNumber: "",
    };
  }
  return {
    firstName: candidate.firstName ?? "",
    lastName: candidate.lastName ?? "",
    fullName: candidate.fullName ?? "",
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    age: candidate.age != null ? String(candidate.age) : "",
    gender: candidate.gender ?? "",
    city: candidate.city ?? "",
    address: candidate.address ?? "",
    sectors: candidate.sectors ?? [],
    jobType: candidate.jobType ?? "",
    jobPermanence: candidate.jobPermanence ?? "",
    salaryExpectation: candidate.salaryExpectation != null ? String(candidate.salaryExpectation) : "",
    freeText: candidate.freeText ?? "",
    additionalInfo: candidate.additionalInfo ?? "",
    additionalNotes: "",
    motherTongue: candidate.motherTongue ?? "",
    additionalLanguages: candidate.additionalLanguages ?? [],
    additionalLanguagesText: "",
    tags: candidate.tags ?? [],
    idNumber: candidate.idNumber ?? "",
    status: candidate.status ?? "",
    statusNotes: candidate.statusNotes ?? "",
    registrationDate: candidate.registrationDate ? candidate.registrationDate.slice(0, 10) : "",
    cvUrl: candidate.cvUrl ?? "",
    placedJob: candidate.placedJob ?? "",
    placedCompany: candidate.placedCompany ?? "",
    firstPaymentDate: "",
    secondPaymentDate: "",
    workExperienceDetails: candidate.workExperienceDetails ?? "",
    trainingDetails: candidate.trainingDetails ?? "",
    hasWorkExperience: candidate.hasWorkExperience ?? false,
    hasTraining: candidate.hasTraining ?? false,
    jobListingNumber: candidate.jobListingNumber != null ? String(candidate.jobListingNumber) : "",
  };
}

