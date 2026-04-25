import { Flame } from "lucide-react";
import type { JobStatus } from "@/lib/api";

const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "טיוטה",
  open: "פתוחה",
  filled: "נסגרה",
  closed: "סגורה",
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  filled: "bg-gray-100 text-gray-500 border-gray-200 line-through",
  closed: "bg-red-50 text-red-700 border-red-200",
};

interface JobStatusPillProps {
  status?: JobStatus;
  urgent?: boolean;
}

export function JobStatusPill({ status, urgent }: JobStatusPillProps) {
  const s: JobStatus = status ?? "open";
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_CLASSES[s]}`}
      >
        {STATUS_LABELS[s]}
      </span>
      {urgent && (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#F7941D]">
          <Flame className="size-3" />
          חמה
        </span>
      )}
    </div>
  );
}
