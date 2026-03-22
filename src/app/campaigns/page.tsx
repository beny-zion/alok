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
import { getCampaigns, type CampaignData } from "@/lib/api";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "טיוטה", variant: "secondary" },
  sent: { label: "נשלח", variant: "default" },
  failed: { label: "נכשל", variant: "destructive" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const res = await getCampaigns();
      if (res.success && res.data) {
        setCampaigns(res.data);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B1464]">קמפיינים</h1>
        <p className="text-sm text-muted-foreground mt-1">היסטוריית קמפיינים ששלחת</p>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>נושא</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>נמענים</TableHead>
              <TableHead>תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  טוען...
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  עדיין לא נשלחו קמפיינים
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => {
                const status = STATUS_MAP[c.status] || STATUS_MAP.draft;
                return (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.subject}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{c.recipientCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
