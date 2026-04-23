"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { getSmooveUsage, type SmooveUsage } from "@/lib/api";

export function SmooveUsageBanner() {
  const [usage, setUsage] = useState<SmooveUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSmooveUsage()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setUsage(res.data);
        else setError(res.error || "שגיאה בבדיקת Smoove");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
        <Loader2 className="size-4 animate-spin" />
        בודק סטטוס Smoove...
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
        <AlertTriangle className="size-4" />
        לא ניתן לבדוק סטטוס Smoove: {error || "לא ידוע"}
      </div>
    );
  }

  const barColor = usage.isAtLimit
    ? "bg-red-500"
    : usage.isNearLimit
      ? "bg-amber-500"
      : "bg-emerald-500";
  const textColor = usage.isAtLimit
    ? "text-red-700"
    : usage.isNearLimit
      ? "text-amber-700"
      : "text-emerald-700";
  const bgColor = usage.isAtLimit
    ? "bg-red-50 border-red-200"
    : usage.isNearLimit
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200";

  return (
    <div className={`rounded-lg border ${bgColor} px-4 py-3`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
          {usage.isAtLimit ? (
            <AlertTriangle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <span>
            {usage.total.toLocaleString("he-IL")} / {usage.planLimit.toLocaleString("he-IL")} אנשי קשר ב-Smoove
          </span>
        </div>
        <span className={`text-xs font-semibold ${textColor}`}>{usage.percent}%</span>
      </div>
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      {usage.isAtLimit && (
        <p className="text-xs text-red-700 mt-2">
          הגעת למכסת התוכנית. מועמדים חדשים לא יסונכרנו עד שתשדרגו או תפנו מקום.
        </p>
      )}
      {!usage.isAtLimit && usage.isNearLimit && (
        <p className="text-xs text-amber-700 mt-2">
          מתקרבים למכסה — נותרו {usage.remaining} מקומות פנויים.
        </p>
      )}
    </div>
  );
}
