"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  getJobs,
  getJobFilters,
  type JobListingData,
  type JobFilterOptions,
} from "@/lib/api";
import { Briefcase, Loader2, Building2, MapPin, Plus, Globe } from "lucide-react";
import { JobFilters, EMPTY_JOB_FILTERS, type JobFiltersState } from "@/components/jobs/job-filters";
import { JobStatusPill } from "@/components/jobs/job-status-pill";
import { JobEditSheet } from "@/components/jobs/job-edit-sheet";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<JobFiltersState>(EMPTY_JOB_FILTERS);
  const [filterOptions, setFilterOptions] = useState<JobFilterOptions | undefined>(undefined);
  const [editing, setEditing] = useState<JobListingData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchJobs = useCallback(async (state: JobFiltersState) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (state.search) params.search = state.search;
      if (state.status) params.status = state.status;
      if (state.sector) params.sector = state.sector;
      if (state.workArea) params.workArea = state.workArea;
      if (state.urgent) params.urgent = state.urgent;
      if (state.publicVisible) params.publicVisible = state.publicVisible;
      const res = await getJobs(params);
      if (res.success && res.data) {
        setJobs(res.data.jobs);
        setTotal(res.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getJobFilters().then((res) => {
      if (res.success && res.data) setFilterOptions(res.data);
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchJobs(filters), 250);
    return () => clearTimeout(timeout);
  }, [filters, fetchJobs]);

  const handleNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const handleRowClick = (job: JobListingData) => {
    setEditing(job);
    setSheetOpen(true);
  };

  const handleSaved = () => {
    fetchJobs(filters);
    getJobFilters().then((res) => {
      if (res.success && res.data) setFilterOptions(res.data);
    });
  };

  const handleDeleted = () => {
    fetchJobs(filters);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0D0B3E] tracking-tight">משרות</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {total > 0 ? `${total} משרות במערכת` : "אין משרות עדיין"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/public/jobs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1B1464] px-3 py-2 rounded-md border border-gray-200 hover:border-[#1B1464]/30 transition-colors"
          >
            <Globe className="size-3.5" />
            Feed ציבורי
          </a>
          <Button
            onClick={handleNew}
            className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-1.5 h-9"
          >
            <Plus className="size-4" />
            משרה חדשה
          </Button>
        </div>
      </div>

      <JobFilters
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_JOB_FILTERS)}
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-200 hover:bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">כותרת</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">חברה</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">תחום</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">אזור</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">מס׳</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">סטטוס</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">מועמדים</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">פרסום</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="size-6 animate-spin" />
                    <span className="text-sm">טוען משרות...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Briefcase className="size-8" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium">אין משרות התואמות לסינון</p>
                      <p className="text-xs mt-0.5">הוסף משרה חדשה או נקה את הסינון</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((j) => {
                const isFilled = j.status === "filled";
                return (
                  <TableRow
                    key={j._id}
                    onClick={() => handleRowClick(j)}
                    className="border-b border-gray-100 hover:bg-gray-50/70 cursor-pointer"
                  >
                    <TableCell className="max-w-[260px]">
                      <div
                        className={`text-sm font-medium ${
                          isFilled ? "text-gray-400 line-through" : "text-gray-900"
                        }`}
                      >
                        {j.title || j.sector || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-[#1B1464]/8 flex items-center justify-center shrink-0">
                          <Building2 className="size-3 text-[#1B1464]" />
                        </div>
                        <span className="text-sm text-gray-700 truncate max-w-[160px]">
                          {j.companyName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">{j.sector || "—"}</span>
                    </TableCell>
                    <TableCell>
                      {j.workArea ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="size-3 text-gray-400 shrink-0" />
                          {j.workArea}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500 tabular-nums" dir="ltr">
                        {j.jobNumber || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <JobStatusPill status={j.status} urgent={j.urgent} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600 tabular-nums">
                        {j.placementsCount && j.placementsCount > 0 ? (
                          <span className="text-emerald-700 font-medium">
                            {j.placementsCount} השמות
                          </span>
                        ) : (
                          "—"
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {j.publicVisible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                          <Globe className="size-3" />
                          באתר
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">פנימי</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 tabular-nums">
                      {new Date(j.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <JobEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        job={editing}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
