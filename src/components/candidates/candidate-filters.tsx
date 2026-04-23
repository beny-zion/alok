"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, SlidersHorizontal, Mail, Phone, UserX } from "lucide-react";
import type { FilterOptions } from "@/lib/api";

export interface CandidateFiltersState {
  search: string;
  city: string;
  sector: string;
  gender: string;
  jobType: string;
  jobPermanence: string;
  status: string;
  tag: string;
  source: string;
  hasEmail: string; // "", "true", "false"
  hasPhone: string;
  noName: string; // "", "true"
  smooveStatus: string; // "", "synced", "pending", "error", "unsynced"
  ageMin: string;
  ageMax: string;
  salaryMin: string;
  salaryMax: string;
}

export const EMPTY_FILTERS: CandidateFiltersState = {
  search: "",
  city: "",
  sector: "",
  gender: "",
  jobType: "",
  jobPermanence: "",
  status: "",
  tag: "",
  source: "",
  hasEmail: "",
  hasPhone: "",
  noName: "",
  smooveStatus: "",
  ageMin: "",
  ageMax: "",
  salaryMin: "",
  salaryMax: "",
};

const SOURCE_LABELS: Record<string, string> = {
  "elementor-webhook": "טופס אלמנטור",
  "csv-import": "ייבוא CSV",
  manual: "יצירה ידנית",
};

const SMOOVE_STATUS_LABELS: Record<string, string> = {
  synced: "סונכרן",
  pending: "ממתין",
  error: "שגיאה",
  unsynced: "לא סונכרן (כולל ללא מייל)",
};

interface CandidateFiltersProps {
  filters: CandidateFiltersState;
  filterOptions?: FilterOptions;
  onChange: (filters: CandidateFiltersState) => void;
  onReset: () => void;
  // Filters the parent has locked — UI hides/disables controls for these keys
  // so the user can't override them.
  lockedKeys?: ReadonlyArray<keyof CandidateFiltersState>;
}

export function CandidateFilters({
  filters,
  filterOptions,
  onChange,
  onReset,
  lockedKeys,
}: CandidateFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasFilters = Object.values(filters).some((v) => v !== "");
  const isLocked = (key: keyof CandidateFiltersState) =>
    lockedKeys?.includes(key) ?? false;

  const cities = filterOptions?.cities ?? [];
  const sectors = filterOptions?.sectors ?? [];
  const genders = filterOptions?.genders ?? [];
  const jobTypes = filterOptions?.jobTypes ?? [];
  const jobPermanences = filterOptions?.jobPermanences ?? [];
  const tags = filterOptions?.tags ?? [];
  const statuses = filterOptions?.statuses ?? [];
  const sources = filterOptions?.sources ?? [];

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "search" && v !== "").length;

  const update = (patch: Partial<CandidateFiltersState>) =>
    onChange({ ...filters, ...patch });

  // Quick-filter button definitions — each sets a specific combination of filters
  const quickFilters = [
    {
      key: "with-email",
      label: "עם מייל",
      icon: <Mail className="size-3.5" />,
      isActive: filters.hasEmail === "true" && filters.hasPhone === "" && filters.noName === "",
      apply: () => update({ hasEmail: "true", hasPhone: "", noName: "" }),
    },
    {
      key: "phone-only",
      label: "עם טלפון, ללא מייל",
      icon: <Phone className="size-3.5" />,
      isActive: filters.hasPhone === "true" && filters.hasEmail === "false" && filters.noName === "",
      apply: () => update({ hasPhone: "true", hasEmail: "false", noName: "" }),
    },
    {
      key: "no-name",
      label: "ללא שם",
      icon: <UserX className="size-3.5" />,
      isActive: filters.noName === "true",
      apply: () => update({ noName: "true" }),
    },
  ];

  const clearQuickFilter = () =>
    update({ hasEmail: "", hasPhone: "", noName: "" });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Quick filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium">סינון מהיר:</span>
        {quickFilters.map((qf) => (
          <Button
            key={qf.key}
            type="button"
            size="sm"
            variant={qf.isActive ? "default" : "outline"}
            onClick={() => (qf.isActive ? clearQuickFilter() : qf.apply())}
            className={`h-7 text-xs gap-1.5 ${
              qf.isActive
                ? "bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
                : "text-gray-600 hover:text-[#1B1464] hover:border-[#1B1464]/40"
            }`}
          >
            {qf.icon}
            {qf.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="חיפוש לפי שם, אימייל, טלפון או ת.ז...."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pr-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm h-9"
          />
        </div>

        <FilterSelect
          placeholder="אזור"
          value={filters.city}
          options={cities}
          onChange={(v) => update({ city: v })}
          width="w-[140px]"
          allLabel="כל האזורים"
        />
        <FilterSelect
          placeholder="תחום"
          value={filters.sector}
          options={sectors}
          onChange={(v) => update({ sector: v })}
          width="w-[160px]"
          allLabel="כל התחומים"
        />
        <FilterSelect
          placeholder="מין"
          value={filters.gender}
          options={genders}
          onChange={(v) => update({ gender: v })}
          width="w-[110px]"
          allLabel="כל המינים"
        />
        <FilterSelect
          placeholder="היקף"
          value={filters.jobType}
          options={jobTypes}
          onChange={(v) => update({ jobType: v })}
          width="w-[130px]"
          allLabel="כל ההיקפים"
        />
        {statuses.length > 0 && (
          <FilterSelect
            placeholder="סטטוס"
            value={filters.status}
            options={statuses}
            onChange={(v) => update({ status: v })}
            width="w-[140px]"
            allLabel="כל הסטטוסים"
          />
        )}
        {tags.length > 0 && (
          <FilterSelect
            placeholder="תגית / מקור"
            value={filters.tag}
            options={tags}
            onChange={(v) => update({ tag: v })}
            width="w-[160px]"
            allLabel="כל התגיות"
          />
        )}

        {/* Advanced filters popover */}
        <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-sm"
              />
            }
          >
            <SlidersHorizontal className="size-3.5" />
            מתקדם
            {activeCount - baseActive(filters) > 0 && (
              <span className="ml-1 bg-[#1B1464] text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center">
                {activeCount - baseActive(filters)}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-4 space-y-3">
            {/* Smoove sync status — hidden when the parent has locked this filter */}
            {!isLocked("smooveStatus") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">סטטוס סנכרון Smoove</label>
                <Select
                  value={filters.smooveStatus || "all"}
                  onValueChange={(v) => update({ smooveStatus: !v || v === "all" ? "" : String(v) })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="synced">{SMOOVE_STATUS_LABELS.synced}</SelectItem>
                    <SelectItem value="pending">{SMOOVE_STATUS_LABELS.pending}</SelectItem>
                    <SelectItem value="error">{SMOOVE_STATUS_LABELS.error}</SelectItem>
                    <SelectItem value="unsynced">{SMOOVE_STATUS_LABELS.unsynced}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">יש אימייל</label>
                <Select
                  value={filters.hasEmail || "all"}
                  onValueChange={(v) => update({ hasEmail: !v || v === "all" ? "" : String(v) })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="true">עם מייל</SelectItem>
                    <SelectItem value="false">ללא מייל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">יש טלפון</label>
                <Select
                  value={filters.hasPhone || "all"}
                  onValueChange={(v) => update({ hasPhone: !v || v === "all" ? "" : String(v) })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="true">עם טלפון</SelectItem>
                    <SelectItem value="false">ללא טלפון</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {jobPermanences.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">קביעות משרה</label>
                <Select
                  value={filters.jobPermanence || "all"}
                  onValueChange={(v) => update({ jobPermanence: !v || v === "all" ? "" : String(v) })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    {jobPermanences.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sources.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">מקור המועמד</label>
                <Select
                  value={filters.source || "all"}
                  onValueChange={(v) => update({ source: !v || v === "all" ? "" : String(v) })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>{SOURCE_LABELS[s] || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">גיל מינימום</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="18"
                  value={filters.ageMin}
                  onChange={(e) => update({ ageMin: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">גיל מקסימום</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="65"
                  value={filters.ageMax}
                  onChange={(e) => update({ ageMax: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">שכר מינימום</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="5000"
                  dir="ltr"
                  value={filters.salaryMin}
                  onChange={(e) => update({ salaryMin: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">שכר מקסימום</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="30000"
                  dir="ltr"
                  value={filters.salaryMax}
                  onChange={(e) => update({ salaryMax: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

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

function baseActive(f: CandidateFiltersState): number {
  // Count filters that are shown as inline selects (not in advanced popover)
  return [f.city, f.sector, f.gender, f.jobType, f.status, f.tag].filter(Boolean).length;
}

function FilterSelect({
  placeholder,
  allLabel,
  value,
  options,
  onChange,
  width,
}: {
  placeholder: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  width: string;
}) {
  return (
    <Select
      value={value || "הכל"}
      onValueChange={(v) => onChange(!v || v === "הכל" ? "" : String(v))}
    >
      <SelectTrigger className={`${width} h-9 text-sm bg-gray-50 border-gray-200`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="הכל">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
