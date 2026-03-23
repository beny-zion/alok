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
import { Label } from "@/components/ui/label";
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

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="חיפוש לפי שם, אימייל, טלפון..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">אזור</Label>
        <Select
          value={filters.city || "הכל"}
          onValueChange={(v) => onChange({ ...filters, city: v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="הכל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">הכל</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">תחום</Label>
        <Select
          value={filters.sector || "הכל"}
          onValueChange={(v) => onChange({ ...filters, sector: v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="הכל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">הכל</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>{sector}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">מין</Label>
        <Select
          value={filters.gender || "הכל"}
          onValueChange={(v) => onChange({ ...filters, gender: v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="הכל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">הכל</SelectItem>
            {genders.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">היקף משרה</Label>
        <Select
          value={filters.jobType || "הכל"}
          onValueChange={(v) => onChange({ ...filters, jobType: v === "הכל" ? "" : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="הכל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="הכל">הכל</SelectItem>
            {jobTypes.map((jt) => (
              <SelectItem key={jt} value={jt}>{jt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button variant="ghost" onClick={onReset} className="text-sm">
          נקה הכל
        </Button>
      )}
    </div>
  );
}
