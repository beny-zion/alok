"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { deleteCandidate, type CandidateData } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

interface CandidateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateData | null;
  onEdit: (candidate: CandidateData) => void;
  onDelete: () => void;
}

function Field({ label, value, dir }: { label: string; value?: string | number | null; dir?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm" dir={dir}>{value || "—"}</p>
    </div>
  );
}

export function CandidateDetailDialog({
  open,
  onOpenChange,
  candidate,
  onEdit,
  onDelete,
}: CandidateDetailDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!candidate) return null;

  const sourceLabel = candidate.source === "manual" ? "ידני" : "טופס אלמנטור";

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteCandidate(candidate._id);
      if (res.success) {
        toast.success("המועמד נמחק בהצלחה (גם מסמווב)");
        onOpenChange(false);
        onDelete();
      } else {
        toast.error(res.error || "שגיאה במחיקת המועמד");
      }
    } catch {
      toast.error("שגיאה במחיקת המועמד");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">
              {candidate.firstName} {candidate.lastName}
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {sourceLabel}
            </Badge>
          </div>
          <DialogDescription>{candidate.email}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 py-2">
          {/* Personal Details */}
          <div>
            <h4 className="text-sm font-semibold text-[#1B1464] mb-3">פרטים אישיים</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="טלפון" value={candidate.phone} dir="ltr" />
              <Field label="גיל" value={candidate.age} />
              <Field label="מין" value={candidate.gender} />
              <Field label="עיר" value={candidate.city} />
              <Field label="כתובת" value={candidate.address} />
              <Field label="שפת אם" value={candidate.motherTongue} />
            </div>
            {candidate.additionalLanguages && candidate.additionalLanguages.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">שפות נוספות</p>
                <div className="flex flex-wrap gap-1">
                  {candidate.additionalLanguages.map((lang) => (
                    <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Job Preferences */}
          <div>
            <h4 className="text-sm font-semibold text-[#1B1464] mb-3">העדפות תעסוקה</h4>
            {candidate.sectors && candidate.sectors.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">תחומים</p>
                <div className="flex flex-wrap gap-1">
                  {candidate.sectors.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="סוג משרה" value={candidate.jobType} />
              <Field label="קביעות" value={candidate.jobPermanence} />
              <Field label="ציפיות שכר" value={candidate.salaryExpectation ? `₪${candidate.salaryExpectation.toLocaleString()}` : undefined} />
            </div>
          </div>

          {/* Additional Info */}
          {(candidate.freeText || candidate.additionalInfo || candidate.hasWorkExperience !== undefined || candidate.hasTraining !== undefined) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-[#1B1464] mb-3">מידע נוסף</h4>
                <div className="space-y-3">
                  {candidate.freeText && <Field label="טקסט חופשי" value={candidate.freeText} />}
                  {candidate.hasWorkExperience !== undefined && (
                    <Field
                      label="ניסיון תעסוקתי"
                      value={candidate.hasWorkExperience
                        ? (candidate.workExperienceDetails || "כן")
                        : "לא"}
                    />
                  )}
                  {candidate.hasTraining !== undefined && (
                    <Field
                      label="הכשרה"
                      value={candidate.hasTraining
                        ? (candidate.trainingDetails || "כן")
                        : "לא"}
                    />
                  )}
                  {candidate.additionalInfo && <Field label="הערות נוספות" value={candidate.additionalInfo} />}
                  {candidate.cvUrl && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">קורות חיים</p>
                      <a
                        href={candidate.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#2563EB] hover:underline"
                      >
                        צפה בקורות חיים
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div>
              <span>נוצר: </span>
              {new Date(candidate.createdAt).toLocaleDateString("he-IL")}
            </div>
            <div>
              <span>עודכן: </span>
              {new Date(candidate.updatedAt).toLocaleDateString("he-IL")}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            onBlur={() => setConfirmDelete(false)}
          >
            {deleting ? "מוחק..." : confirmDelete ? "לחץ שוב לאישור" : "מחק מועמד"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              סגור
            </Button>
            <Button
              className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
              onClick={() => {
                onOpenChange(false);
                onEdit(candidate);
              }}
            >
              עריכה
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
