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

interface JobListing {
  _id: string;
  companyName: string;
  sector: string;
  workArea?: string;
  jobType?: string;
  jobPermanence?: string;
  salary?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, we'll add a jobs API route later if needed
    // This page shows jobs received from the employer webhook
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B1464]">משרות</h1>
        <p className="text-sm text-muted-foreground mt-1">משרות שהתקבלו מטופס מעסיקים</p>
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
              <TableHead>איש קשר</TableHead>
              <TableHead>תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  טוען...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  עדיין לא התקבלו משרות
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((j) => (
                <TableRow key={j._id}>
                  <TableCell className="font-medium">{j.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{j.sector}</Badge>
                  </TableCell>
                  <TableCell>{j.workArea || "—"}</TableCell>
                  <TableCell>{j.jobType || "—"}</TableCell>
                  <TableCell>{j.salary ? `₪${j.salary.toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="text-sm">
                    {j.contactName && <div>{j.contactName}</div>}
                    {j.contactPhone && <div dir="ltr" className="text-muted-foreground">{j.contactPhone}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
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
