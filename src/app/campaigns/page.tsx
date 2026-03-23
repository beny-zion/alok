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
import { Button } from "@/components/ui/button";
import { getCampaigns, type CampaignData } from "@/lib/api";
import {
  Mail,
  Loader2,
  InboxIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  PenLine,
} from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
  sent: {
    label: "נשלח",
    icon: CheckCircle2,
    className: "text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  draft: {
    label: "טיוטה",
    icon: Clock,
    className: "text-gray-500",
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
  },
  failed: {
    label: "נכשל",
    icon: XCircle,
    className: "text-red-600",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
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

  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0D0B3E] tracking-tight">קמפיינים</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">היסטוריית קמפיינים ששלחת</p>
        </div>
        <Link href="/compose">
          <Button className="bg-[#F7941D] hover:bg-[#e0850f] text-white gap-2 shadow-sm">
            <PenLine className="size-4" />
            קמפיין חדש
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="size-4 text-gray-400" />
              <span className="text-xs text-gray-500">סה״כ קמפיינים</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{campaigns.length}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-xs text-gray-500">נשלחו בהצלחה</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{sentCount}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="size-4 text-blue-500" />
              <span className="text-xs text-gray-500">סה״כ נמענים</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{totalRecipients.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-200 hover:bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">נושא</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">סטטוס</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">נמענים</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="size-6 animate-spin" />
                    <span className="text-sm">טוען קמפיינים...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <InboxIcon className="size-8" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium">עדיין לא נשלחו קמפיינים</p>
                      <p className="text-xs mt-0.5">צור קמפיין חדש כדי לשלוח דיוור למועמדים</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => {
                const config = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                const StatusIcon = config.icon;
                return (
                  <TableRow key={c._id} className="border-b border-gray-100 hover:bg-gray-50/70">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-[#1B1464]/8 flex items-center justify-center shrink-0">
                          <Mail className="size-3.5 text-[#1B1464]" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{c.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${config.badgeClass}`}>
                        <StatusIcon className="size-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 tabular-nums">
                        {c.recipientCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-400 tabular-nums">
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
