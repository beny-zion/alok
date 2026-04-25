"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Phone, Mail, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateSubmissionStage,
  deleteSubmission,
  type SubmissionData,
  type SubmissionStage,
} from "@/lib/api";

const STAGE_LABELS: Record<SubmissionStage, string> = {
  proposed: "הוצע",
  cv_sent: 'קו"ח נשלח',
  interview: "בראיון",
  hired: "התקבל",
  first_payment: "פעימה ראשונה",
  second_payment: "פעימה שנייה",
  rejected: "לא התאים",
};

const STAGE_ORDER: SubmissionStage[] = [
  "proposed",
  "cv_sent",
  "interview",
  "hired",
  "first_payment",
  "second_payment",
  "rejected",
];

const STAGE_COLORS: Record<SubmissionStage, string> = {
  proposed: "bg-gray-100 text-gray-700",
  cv_sent: "bg-blue-50 text-blue-700",
  interview: "bg-purple-50 text-purple-700",
  hired: "bg-emerald-50 text-emerald-700",
  first_payment: "bg-emerald-100 text-emerald-800",
  second_payment: "bg-emerald-200 text-emerald-900",
  rejected: "bg-red-50 text-red-700",
};

interface JobSubmissionsBoardProps {
  submissions: SubmissionData[];
  onChanged: () => void;
}

export function JobSubmissionsBoard({ submissions, onChanged }: JobSubmissionsBoardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleStageChange = async (submissionId: string, stage: SubmissionStage) => {
    setPendingId(submissionId);
    try {
      const res = await updateSubmissionStage(submissionId, { stage });
      if (res.success) {
        toast.success(`עודכן לשלב "${STAGE_LABELS[stage]}"`);
        onChanged();
      } else {
        toast.error(res.error || "עדכון נכשל");
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!confirm("להסיר את המועמד מהמשרה?")) return;
    setPendingId(submissionId);
    try {
      const res = await deleteSubmission(submissionId);
      if (res.success) {
        toast.success("המועמד הוסר");
        onChanged();
      } else {
        toast.error(res.error || "שגיאה");
      }
    } finally {
      setPendingId(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400 border border-dashed rounded-lg">
        עדיין לא צורפו מועמדים למשרה זו
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((s) => {
        const c = typeof s.candidateId === "object" ? s.candidateId : null;
        const name = c
          ? [c.firstName, c.lastName].filter(Boolean).join(" ") ||
            c.fullName ||
            c.email ||
            c.phone ||
            "מועמד"
          : "מועמד";
        const isPending = pendingId === s._id;
        return (
          <div
            key={s._id}
            className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${STAGE_COLORS[s.stage]}`}
                  >
                    {STAGE_LABELS[s.stage]}
                  </span>
                </div>
                {c && (
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-gray-500">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 hover:text-[#2563EB]"
                        dir="ltr"
                      >
                        <Mail className="size-3" />
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex items-center gap-1 hover:text-[#2563EB]"
                        dir="ltr"
                      >
                        <Phone className="size-3" />
                        {c.phone}
                      </a>
                    )}
                    {c.cvUrl && (
                      <a
                        href={c.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
                      >
                        <FileText className="size-3" />
                        קורות חיים
                      </a>
                    )}
                  </div>
                )}
                {s.hiredAt && (
                  <div className="text-[10px] text-emerald-700 mt-1">
                    התקבל: {new Date(s.hiredAt).toLocaleDateString("he-IL")}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={s.stage}
                  onValueChange={(v) => v && handleStageChange(s._id, v as SubmissionStage)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue>
                      {(v: unknown) =>
                        STAGE_LABELS[v as SubmissionStage] ?? "—"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_ORDER.map((stg) => (
                      <SelectItem key={stg} value={stg}>
                        {STAGE_LABELS[stg]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                  onClick={() => handleDelete(s._id)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
