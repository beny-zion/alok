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
import { Search, X } from "lucide-react";
import type { FilterOptions } from "@/lib/api";

interface CandidateFiltersProps {
  filters: {
    search: string;
    city: string;
    sector: string;
    gender: string;
    jobType: string;
  };
  filterOptions?: FilterOptions;
  onChange: (filters: CandidateFiltersProps["filters"]) => void;
  onReset: () => void;
}

export function CandidateFilters({ filters, filterOptions, onChange, onReset }: CandidateFiltersProps) {
  const hasFilters = Object.values(filters).some((v) => v !== "");

  const cities = filterOptions?.cities ?? [];
  const sectors = filterOptions?.sectors ?? [];
  const genders = filterOptions?.genders ?? [];
  const jobTypes = filterOptions?.jobTypes ?? [];

  const activeCount = [filters.city, filters.sector, filters.gender, filters.jobType].filter(Boolean).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pr-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm h-9"
          />
        </div>

        {/* Filter dropdowns */}
        <Select
          value={filters.city || "הכל"}
          onValueChange={(v) => onChange({ ...filters, city: !v || v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[140px] h-9 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="אזור" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">כל האזורים</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sector || "הכל"}
          onValueChange={(v) => onChange({ ...filters, sector: !v || v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="תחום" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">כל התחומים</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>{sector}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.gender || "הכל"}
          onValueChange={(v) => onChange({ ...filters, gender: !v || v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[110px] h-9 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="מין" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">כל המינים</SelectItem>
            {genders.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.jobType || "הכל"}
          onValueChange={(v) => onChange({ ...filters, jobType: !v || v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[130px] h-9 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="היקף" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">כל ההיקפים</SelectItem>
            {jobTypes.map((jt) => (
              <SelectItem key={jt} value={jt}>{jt}</SelectItem>
            ))}
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
