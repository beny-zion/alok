"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getJobs, JobListingData } from "@/lib/api";
import {
  Briefcase,
  Search,
  Loader2,
  Building2,
  MapPin,
  Phone,
} from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchJobs = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      const res = await getJobs(params);
      if (res.success && res.data) {
        setJobs(res.data.jobs);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchJobs(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0D0B3E] tracking-tight">משרות</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {total > 0 ? `${total} משרות התקבלו מטופס מעסיקים` : "משרות שהתקבלו מטופס מעסיקים"}
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="חיפוש חברה, תחום, אזור..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-200 hover:bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">חברה</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">תחום</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">אזור</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">סוג משרה</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">שכר</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ימי עבודה</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">שעות</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">איש קשר</TableHead>
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
                      <p className="text-sm font-medium">עדיין לא התקבלו משרות</p>
                      <p className="text-xs mt-0.5">משרות חדשות יופיעו כאן כשמעסיקים ימלאו את הטופס</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((j) => (
                <TableRow key={j._id} className="border-b border-gray-100 hover:bg-gray-50/70">
                  {/* Company */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-[#1B1464]/8 flex items-center justify-center shrink-0">
                        <Building2 className="size-3.5 text-[#1B1464]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{j.companyName}</div>
                        {j.companyPhone && (
                          <div dir="ltr" className="text-[11px] text-gray-400">{j.companyPhone}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Sector */}
                  <TableCell>
                    {j.sector ? (
                      <Badge variant="secondary" className="text-[11px] font-normal bg-gray-100 text-gray-600 hover:bg-gray-100">
                        {j.sector}
                      </Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Area */}
                  <TableCell>
                    {j.workArea ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="size-3 text-gray-400 shrink-0" />
                        {j.workArea}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Job type */}
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {j.jobPermanence || <span className="text-gray-300">—</span>}
                    </div>
                  </TableCell>

                  {/* Salary */}
                  <TableCell>
                    {j.salary ? (
                      <span className="text-sm font-medium text-gray-900 tabular-nums">
                        {`₪${j.salary.toLocaleString()}`}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Work days */}
                  <TableCell>
                    {j.workDays && j.workDays.length > 0 ? (
                      <span className="text-sm text-gray-600">{j.workDays.join(", ")}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Work hours */}
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {j.workHours || <span className="text-gray-300">—</span>}
                    </span>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    {(j.contactName || j.contactLastName || j.contactPhone || j.contactEmail) ? (
                      <div className="space-y-0.5">
                        {(j.contactName || j.contactLastName) && (
                          <div className="text-sm text-gray-900">
                            {[j.contactName, j.contactLastName].filter(Boolean).join(" ")}
                          </div>
                        )}
                        {j.contactPhone && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400" dir="ltr">
                            <Phone className="size-2.5" />
                            {j.contactPhone}
                          </div>
                        )}
                        {j.contactEmail && (
                          <a href={`mailto:${j.contactEmail}`} className="text-[11px] text-[#2563EB] hover:underline block">
                            {j.contactEmail}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-sm text-gray-400 tabular-nums">
                    {new Date(j.createdAt).toLocaleDateString("he-IL")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
