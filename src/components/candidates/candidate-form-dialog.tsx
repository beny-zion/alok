"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { candidateFormSchema, type CandidateFormValues } from "@/lib/validators";
import { CITIES, SECTORS, GENDERS, JOB_TYPES, JOB_PERMANENCE } from "@/lib/constants";
import { createCandidate, updateCandidate, type CandidateData } from "@/lib/api";
import { toast } from "sonner";

interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: CandidateData | null;
  onSuccess: () => void;
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function CandidateFormDialog({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: CandidateFormDialogProps) {
  const isEdit = !!candidate;
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: getDefaults(candidate),
  });

  // Reset form when candidate changes (switching between add/edit)
  useEffect(() => {
    if (open) {
      form.reset(getDefaults(candidate));
    }
  }, [open, candidate, form]);

  const onSubmit = async (values: CandidateFormValues) => {
    setSubmitting(true);
    try {
      const ageNum = values.age ? Number(values.age) : undefined;
      const salaryNum = values.salaryExpectation ? Number(values.salaryExpectation) : undefined;
      const cleaned = {
        ...values,
        age: ageNum && !isNaN(ageNum) ? ageNum : undefined,
        salaryExpectation: salaryNum && !isNaN(salaryNum) ? salaryNum : undefined,
      };

      const res = isEdit
        ? await updateCandidate(candidate!._id, cleaned)
        : await createCandidate(cleaned);

      if (res.success) {
        toast.success(isEdit ? "המועמד עודכן בהצלחה" : "המועמד נוסף בהצלחה");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.error || "שגיאה בשמירת המועמד");
      }
    } catch {
      toast.error("שגיאה בשמירת המועמד");
    } finally {
      setSubmitting(false);
    }
  };

  const { errors } = form.formState;
  const watchedSectors = form.watch("sectors");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEdit ? "עריכת מועמד" : "הוספת מועמד"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "ערוך את פרטי המועמד. השינויים יסונכרנו גם לסמווב."
              : "הזן את פרטי המועמד החדש. הוא יסונכרן אוטומטית לסמווב."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 space-y-5 py-2 px-1"
        >
          {/* Personal Details */}
          <div>
            <h4 className="text-sm font-semibold text-[#1B1464] mb-3">פרטים אישיים</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="שם פרטי" required error={errors.firstName?.message}>
                <Input {...form.register("firstName")} />
              </FormField>
              <FormField label="שם משפחה" error={errors.lastName?.message}>
                <Input {...form.register("lastName")} />
              </FormField>
              <FormField label="אימייל" required error={errors.email?.message}>
                <Input type="email" dir="ltr" {...form.register("email")} />
              </FormField>
              <FormField label="טלפון" error={errors.phone?.message}>
                <Input type="tel" dir="ltr" {...form.register("phone")} />
              </FormField>
              <FormField label="גיל" error={errors.age?.message}>
                <Input type="number" {...form.register("age")} />
              </FormField>
              <FormField label="מין">
                <Controller
                  name="gender"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-semibold text-[#1B1464] mb-3">מיקום</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="עיר">
                <Controller
                  name="city"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר עיר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {CITIES.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="כתובת">
                <Input {...form.register("address")} />
              </FormField>
            </div>
          </div>

          {/* Job Preferences */}
          <div>
            <h4 className="text-sm font-semibold text-[#1B1464] mb-3">
              העדפות תעסוקה
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <FormField label="סוג משרה">
                <Controller
                  name="jobType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {JOB_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="קביעות">
                <Controller
                  name="jobPermanence"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {JOB_PERMANENCE.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="ציפיות שכר" error={errors.salaryExpectation?.message}>
                <Input type="number" dir="ltr" {...form.register("salaryExpectation")} />
              </FormField>
            </div>

            {/* Sectors */}
            <div className="space-y-2">
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
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {SECTORS.map((sector) => {
                        const checked = field.value.includes(sector);
                        return (
                          <label
                            key={sector}
                            className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                if (v) {
                                  field.onChange([...field.value, sector]);
                                } else {
                                  field.onChange(field.value.filter((s: string) => s !== sector));
                                }
                              }}
                            />
                            <span className="truncate">{sector}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <h4 className="text-sm font-semibold text-[#1B1464] mb-3">מידע נוסף</h4>
            <div className="space-y-4">
              <FormField label="טקסט חופשי">
                <Textarea rows={2} {...form.register("freeText")} />
              </FormField>
              <FormField label="הערות נוספות">
                <Textarea rows={2} {...form.register("additionalInfo")} />
              </FormField>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            ביטול
          </Button>
          <Button
            className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
            onClick={form.handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף מועמד"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDefaults(candidate?: CandidateData | null): CandidateFormValues {
  if (!candidate) {
    return {
      firstName: "",
      lastName: "",
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
      motherTongue: "",
      additionalLanguages: [],
    };
  }
  return {
    firstName: candidate.firstName,
    lastName: candidate.lastName ?? "",
    email: candidate.email,
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
    motherTongue: candidate.motherTongue ?? "",
    additionalLanguages: candidate.additionalLanguages ?? [],
  };
}
