"use client";

import { useEffect, useState } from "react";
import { ImportWizard } from "@/components/candidates/import-wizard";
import { getFilterOptions } from "@/lib/api";

export default function ImportPage() {
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    getFilterOptions().then((res) => {
      if (res.success && res.data) {
        setExistingTags(res.data.tags || []);
      }
    });
  }, []);

  return <ImportWizard existingTags={existingTags} />;
}
