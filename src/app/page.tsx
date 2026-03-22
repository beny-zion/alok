"use client";

import { useState } from "react";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1464]">מועמדים</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול מועמדים וסינון לפי קריטריונים</p>
        </div>
        {selectedIds.length > 0 && (
          <Link href={`/compose?ids=${selectedIds.join(",")}`}>
            <Button className="bg-[#F7941D] hover:bg-[#e0850f] text-white">
              שלח קמפיין ל-{selectedIds.length} מועמדים
            </Button>
          </Link>
        )}
      </div>

      <CandidateTable onSelectionChange={setSelectedIds} />
    </div>
  );
}
