"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Flame } from "lucide-react";
import type { JobFilterOptions, JobStatus } from "@/lib/api";

export interface JobFiltersState {
  search: string;
  status: string;
  sector: string;
  workArea: string;
  urgent: string; // "" | "true"
  publicVisible: string; // "" | "true" | "false"
}

export const EMPTY_JOB_FILTERS: JobFiltersState = {
  search: "",
  status: "",
  sector: "",
  workArea: "",
  urgent: "",
  publicVisible: "",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "טיוטה",
  open: "פתוחות",
  filled: "נסגרו",
  closed: "סגורות",
};

interface JobFiltersProps {
  filters: JobFiltersState;
  options?: JobFilterOptions;
  onChange: (next: JobFiltersState) => void;
  onReset: () => void;
}

export function JobFilters({ filters, options, onChange, onReset }: JobFiltersProps) {
  const hasFilters = Object.values(filters).some((v) => v !== "");
  const sectors = options?.sectors ?? [];
  const workAreas = options?.workAreas ?? [];

  const update = (patch: Partial<JobFiltersState>) => onChange({ ...filters, ...patch });
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "search" && v !== "").length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="חיפוש כותרת, חברה, מס׳ משרה..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pr-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm h-9"
          />
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => update({ status: !v || v === "all" ? "" : String(v) })}
        >
          <SelectTrigger className="w-[140px] h-9 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="סטטוס">
              {(v: unknown) =>
                !v || v === "all"
                  ? "כל הסטטוסים"
                  : STATUS_LABELS[v as JobStatus] ?? String(v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="open">{STATUS_LABELS.open}</SelectItem>
            <SelectItem value="draft">{STATUS_LABELS.draft}</SelectItem>
            <SelectItem value="filled">{STATUS_LABELS.filled}</SelectItem>
            <SelectItem value="closed">{STATUS_LABELS.closed}</SelectItem>
          </SelectContent>
        </Select>

        {sectors.length > 0 && (
          <Select
            value={filters.sector || "all"}
            onValueChange={(v) => update({ sector: !v || v === "all" ? "" : String(v) })}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm bg-gray-50 border-gray-200">
              <SelectValue placeholder="תחום">
                {(v: unknown) => (!v || v === "all" ? "כל התחומים" : String(v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התחומים</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {workAreas.length > 0 && (
          <Select
            value={filters.workArea || "all"}
            onValueChange={(v) => update({ workArea: !v || v === "all" ? "" : String(v) })}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm bg-gray-50 border-gray-200">
              <SelectValue placeholder="אזור">
                {(v: unknown) => (!v || v === "all" ? "כל האזורים" : String(v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל האזורים</SelectItem>
              {workAreas.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          size="sm"
          variant={filters.urgent === "true" ? "default" : "outline"}
          onClick={() => update({ urgent: filters.urgent === "true" ? "" : "true" })}
          className={`h-9 text-sm gap-1.5 ${
            filters.urgent === "true"
              ? "bg-[#F7941D] hover:bg-[#F7941D]/90 text-white border-[#F7941D]"
              : "text-gray-600 hover:text-[#F7941D] hover:border-[#F7941D]/40"
          }`}
        >
          <Flame className="size-3.5" />
          חמות
        </Button>

        <Select
          value={filters.publicVisible || "all"}
          onValueChange={(v) => update({ publicVisible: !v || v === "all" ? "" : String(v) })}
        >
          <SelectTrigger className="w-[150px] h-9 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="באתר ציבורי">
              {(v: unknown) =>
                v === "true"
                  ? "מפורסמות"
                  : v === "false"
                  ? "לא מפורסמות"
                  : "באתר ציבורי"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="true">מפורסמות</SelectItem>
            <SelectItem value="false">לא מפורסמות</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700 gap-1 h-9 text-sm"
          >
            <X className="size-3.5" />
            נקה {activeCount > 0 && `(${activeCount})`}
          </Button>
        )}
      </div>
    </div>
  );
}
