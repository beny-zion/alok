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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1464]">משרות</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} משרות התקבלו מטופס מעסיקים` : "משרות שהתקבלו מטופס מעסיקים"}
          </p>
        </div>
        <Input
          placeholder="חיפוש חברה, תחום, אזור..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>חברה</TableHead>
              <TableHead>תחום</TableHead>
              <TableHead>אזור</TableHead>
              <TableHead>סוג משרה</TableHead>
              <TableHead>שכר</TableHead>
              <TableHead>ימי עבודה</TableHead>
              <TableHead>שעות</TableHead>
              <TableHead>איש קשר</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead>תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  טוען...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  עדיין לא התקבלו משרות
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((j) => (
                <TableRow key={j._id}>
                  <TableCell className="font-medium">
                    <div>{j.companyName}</div>
                    {j.companyPhone && (
                      <div dir="ltr" className="text-xs text-muted-foreground">{j.companyPhone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {j.sector ? <Badge variant="secondary">{j.sector}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{j.workArea || "—"}</TableCell>
                  <TableCell>{j.jobPermanence || "—"}</TableCell>
                  <TableCell>{j.salary ? `₪${j.salary.toLocaleString()}` : "—"}</TableCell>
                  <TableCell>
                    {j.workDays && j.workDays.length > 0
                      ? j.workDays.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>{j.workHours || "—"}</TableCell>
                  <TableCell>
                    {j.contactName || j.contactLastName ? (
                      <div>{[j.contactName, j.contactLastName].filter(Boolean).join(" ")}</div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {j.contactPhone ? (
                      <div dir="ltr" className="text-sm">{j.contactPhone}</div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {j.contactEmail ? (
                      <a href={`mailto:${j.contactEmail}`} className="text-sm text-[#2563EB] hover:underline">
                        {j.contactEmail}
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
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
