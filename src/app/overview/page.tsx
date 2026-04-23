"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  MailX,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Briefcase,
  MapPin,
  Tag,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCandidateStats, syncPendingToSmoove, type StatsData } from "@/lib/api";
import { toast } from "sonner";

const SOURCE_LABELS: Record<string, string> = {
  "elementor-webhook": "טופס אלמנטור",
  "csv-import": "ייבוא CSV",
  manual: "יצירה ידנית",
};

export default function OverviewPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const res = await getCandidateStats();
    if (res.success && res.data) setStats(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncPendingToSmoove();
      if (res.success && res.data) {
        const { synced, failed, limitHit, error } = res.data;
        if (limitHit) {
          toast.warning(`סונכרנו ${synced}. הגענו לתקרת Smoove${error ? ` — ${error}` : ""}`);
        } else if (failed > 0) {
          toast.error(`סונכרנו ${synced}, נכשלו ${failed}${error ? ` — ${error}` : ""}`);
        } else {
          toast.success(`סונכרנו ${synced} מועמדים ל-Smoove`);
        }
        fetchStats();
      } else {
        toast.error(res.error || "שגיאה בסנכרון");
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0D0B3E] tracking-tight">סקירה כללית</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            תמונת מצב של כל המועמדים במערכת והסנכרון ל-Smoove
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing || loading || stats?.smoove.pending === 0}
          className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-2"
        >
          {syncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {syncing
            ? "מסנכרן..."
            : stats?.smoove.pending
              ? `סנכרן ${stats.smoove.pending} ממתינים`
              : "סנכרן ממתינים ל-Smoove"}
        </Button>
      </div>

      {loading || !stats ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<Users className="size-5 text-[#1B1464]" />}
              label="סך הכל מועמדים"
              value={stats.total}
            />
            <KpiCard
              icon={<CheckCircle2 className="size-5 text-emerald-600" />}
              label="סונכרנו ל-Smoove"
              value={stats.smoove.synced}
              hint={pct(stats.smoove.synced, stats.total)}
            />
            <KpiCard
              icon={<Clock className="size-5 text-amber-600" />}
              label="ממתינים לסנכרון"
              value={stats.smoove.pending}
              link={stats.smoove.pending > 0 ? "/?smooveStatus=pending" : undefined}
            />
            <KpiCard
              icon={<AlertTriangle className="size-5 text-red-600" />}
              label="שגיאות סנכרון"
              value={stats.smoove.error}
              link={stats.smoove.error > 0 ? "/?smooveStatus=error" : undefined}
            />
          </div>

          {/* Secondary row: source breakdown + noEmail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="פילוח לפי מקור" icon={<Activity className="size-4 text-[#2563EB]" />}>
              {Object.entries(stats.bySource).length === 0 ? (
                <EmptyRow />
              ) : (
                <ul className="space-y-1.5">
                  {Object.entries(stats.bySource)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <li key={source} className="flex items-center justify-between text-sm">
                        <Link
                          href={`/?source=${encodeURIComponent(source)}`}
                          className="text-gray-700 hover:text-[#1B1464]"
                        >
                          {SOURCE_LABELS[source] || source}
                        </Link>
                        <span className="font-semibold text-gray-900 tabular-nums">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>

            <Card title="ללא אימייל" icon={<MailX className="size-4 text-amber-600" />}>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 tabular-nums">
                  {stats.smoove.noEmail}
                </span>
                <span className="text-sm text-gray-500">
                  מועמדים ללא כתובת אימייל ({pct(stats.smoove.noEmail, stats.total)})
                </span>
              </div>
              <Link
                href="/?hasEmail=false"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline"
              >
                הצג רשימה
                <ArrowLeft className="size-3" />
              </Link>
            </Card>

            <Card title="סטטוסים נפוצים" icon={<Tag className="size-4 text-indigo-600" />}>
              {stats.topStatuses.length === 0 ? (
                <EmptyRow />
              ) : (
                <TopList items={stats.topStatuses} param="status" />
              )}
            </Card>
          </div>

          {/* Third row: tops */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="תחומים מובילים" icon={<Briefcase className="size-4 text-[#F7941D]" />}>
              {stats.topSectors.length === 0 ? (
                <EmptyRow />
              ) : (
                <TopList items={stats.topSectors} param="sector" />
              )}
            </Card>
            <Card title="ערים מובילות" icon={<MapPin className="size-4 text-emerald-600" />}>
              {stats.topCities.length === 0 ? (
                <EmptyRow />
              ) : (
                <TopList items={stats.topCities} param="city" />
              )}
            </Card>
            <Card title="תגיות מובילות" icon={<Tag className="size-4 text-rose-600" />}>
              {stats.topTags.length === 0 ? (
                <EmptyRow />
              ) : (
                <TopList items={stats.topTags} param="tag" />
              )}
            </Card>
          </div>

          {/* Recent candidates */}
          <Card title="5 המועמדים האחרונים" icon={<Users className="size-4 text-[#1B1464]" />}>
            {stats.recent.length === 0 ? (
              <EmptyRow />
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recent.map((c) => {
                  const name =
                    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                    c.fullName ||
                    c.email ||
                    c.phone ||
                    "—";
                  return (
                    <li key={c._id} className="py-2 flex items-center justify-between gap-3">
                      <Link href="/" className="text-sm font-medium text-gray-900 hover:text-[#1B1464] truncate">
                        {name}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {c.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" />
                            <span className="truncate max-w-[180px]" dir="ltr">
                              {c.email}
                            </span>
                          </span>
                        )}
                        <span className="tabular-nums">
                          {new Date(c.createdAt).toLocaleDateString("he-IL")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  link?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-3xl font-bold text-gray-900 tabular-nums">{value.toLocaleString("he-IL")}</span>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
    </>
  );

  const base =
    "bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-colors";

  if (link) {
    return (
      <Link href={link} className={`${base} hover:border-[#1B1464]/40 hover:shadow`}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TopList({
  items,
  param,
}: {
  items: Array<{ name: string; count: number }>;
  param: string;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between text-sm">
          <Link
            href={`/?${param}=${encodeURIComponent(item.name)}`}
            className="text-gray-700 hover:text-[#1B1464] truncate"
          >
            {item.name}
          </Link>
          <span className="font-semibold text-gray-900 tabular-nums">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyRow() {
  return <p className="text-xs text-gray-400">אין נתונים להצגה</p>;
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}
