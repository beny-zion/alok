"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateTable } from "@/components/candidates/candidate-table";
import type { CandidateFiltersState } from "@/components/candidates/candidate-filters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Send, Loader2 } from "lucide-react";

const FILTER_KEYS: Array<keyof CandidateFiltersState> = [
  "search",
  "city",
  "sector",
  "gender",
  "jobType",
  "jobPermanence",
  "status",
  "tag",
  "source",
  "hasEmail",
  "hasPhone",
  "noName",
  "smooveStatus",
  "ageMin",
  "ageMax",
  "salaryMin",
  "salaryMax",
];

function HomePageInner() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchParams = useSearchParams();

  const initialFilters = Object.fromEntries(
    FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? ""])
  ) as Partial<CandidateFiltersState>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0D0B3E] tracking-tight">
            ניהול מועמדים
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            צפייה, סינון וניהול כל המועמדים במערכת
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Link href={`/compose?ids=${selectedIds.join(",")}`}>
            <Button className="bg-[#F7941D] hover:bg-[#e0850f] text-white gap-2 shadow-sm">
              <Send className="size-4" />
              שלח קמפיין ל-{selectedIds.length} מועמדים
            </Button>
          </Link>
        )}
      </div>

      <CandidateTable
        onSelectionChange={setSelectedIds}
        initialFilters={initialFilters}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}
