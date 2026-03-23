"use client";

import { useState } from "react";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Send } from "lucide-react";

export default function HomePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <div className="space-y-5">
      {/* Page header */}
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

      {/* Table */}
      <CandidateTable onSelectionChange={setSelectedIds} />
    </div>
  );
}
