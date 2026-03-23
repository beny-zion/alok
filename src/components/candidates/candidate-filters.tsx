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
import { CITIES, SECTORS } from "@/lib/constants";

interface CandidateFiltersProps {
  filters: {
    search: string;
    city: string;
    sector: string;
    gender: string;
    jobType: string;
  };
  onChange: (filters: CandidateFiltersProps["filters"]) => void;
  onReset: () => void;
}

export function CandidateFilters({ filters, onChange, onReset }: CandidateFiltersProps) {
  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="חיפוש לפי שם, אימייל, טלפון..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <Select
        value={filters.city || "all"}
        onValueChange={(v) => onChange({ ...filters, city: v === "all" ? "" : (v ?? "") })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="עיר" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הערים</SelectItem>
          {CITIES.map((city) => (
            <SelectItem key={city} value={city}>{city}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sector || "all"}
        onValueChange={(v) => onChange({ ...filters, sector: v === "all" ? "" : (v ?? "") })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="תחום" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל התחומים</SelectItem>
          {SECTORS.map((sector) => (
            <SelectItem key={sector} value={sector}>{sector}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.gender || "all"}
        onValueChange={(v) => onChange({ ...filters, gender: v === "all" ? "" : (v ?? "") })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="מין" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">הכל</SelectItem>
          <SelectItem value="זכר">זכר</SelectItem>
          <SelectItem value="נקבה">נקבה</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.jobType || "all"}
        onValueChange={(v) => onChange({ ...filters, jobType: v === "all" ? "" : (v ?? "") })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="סוג משרה" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">הכל</SelectItem>
          <SelectItem value="משרה מלאה">משרה מלאה</SelectItem>
          <SelectItem value="משרה חלקית">משרה חלקית</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={onReset} className="text-sm">
          נקה הכל
        </Button>
      )}
    </div>
  );
}

export { SECTORS };
