"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  getCandidates,
  getFilterOptions,
  addSubmissions,
  type CandidateData,
  type FilterOptions,
} from "@/lib/api";

interface CandidatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  existingCandidateIds?: string[];
  onAdded: (added: number) => void;
}

export function CandidatePickerDialog({
  open,
  onOpenChange,
  jobId,
  existingCandidateIds = [],
  onAdded,
}: CandidatePickerDialogProps) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [tag, setTag] = useState("");
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    setCity("");
    setSector("");
    setTag("");
    getFilterOptions().then((res) => {
      if (res.success && res.data) setFilterOptions(res.data);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setLoading(true);
      const params: Record<string, string> = { limit: "50" };
      if (search) params.search = search;
      if (city) params.city = city;
      if (sector) params.sector = sector;
      if (tag) params.tag = tag;
      getCandidates(params)
        .then((res) => {
          if (res.success && res.data) setCandidates(res.data.candidates);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [open, search, city, sector, tag]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await addSubmissions(jobId, Array.from(selected));
      if (res.success && res.data) {
        const added = res.data.added;
        const existed = res.data.existed;
        if (added > 0) {
          toast.success(`נוספו ${added} מועמדים${existed > 0 ? ` (${existed} כבר היו מצורפים)` : ""}`);
        } else {
          toast.info("המועמדים שנבחרו כבר היו מצורפים למשרה");
        }
        onAdded(added);
        onOpenChange(false);
      } else {
        toast.error(res.error || "שגיאה בצירוף");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>צירוף מועמדים למשרה</DialogTitle>
          <DialogDescription>
            סנן ובחר מועמדים שיוצעו למשרה. כל מועמד נוסף ייכנס לשלב &quot;הוצע&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-3 space-y-2 border-b">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="חיפוש שם, אימייל, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={city || "all"} onValueChange={(v) => setCity(!v || v === "all" ? "" : String(v))}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="עיר">
                  {(v: unknown) => (!v || v === "all" ? "כל הערים" : String(v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הערים</SelectItem>
                {(filterOptions?.cities ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sector || "all"} onValueChange={(v) => setSector(!v || v === "all" ? "" : String(v))}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="תחום">
                  {(v: unknown) => (!v || v === "all" ? "כל התחומים" : String(v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התחומים</SelectItem>
                {(filterOptions?.sectors ?? []).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterOptions?.tags ?? []).length > 0 && (
              <Select value={tag || "all"} onValueChange={(v) => setTag(!v || v === "all" ? "" : String(v))}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="תגית">
                    {(v: unknown) => (!v || v === "all" ? "כל התגיות" : String(v))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התגיות</SelectItem>
                  {(filterOptions?.tags ?? []).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {loading ? (
            <div className="flex justify-center py-12 text-gray-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">לא נמצאו מועמדים</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {candidates.map((c) => {
                const already = existingCandidateIds.includes(c._id);
                const checked = selected.has(c._id);
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  c.fullName ||
                  c.email ||
                  c.phone ||
                  "—";
                return (
                  <li
                    key={c._id}
                    className={`py-2.5 flex items-start gap-3 ${
                      already ? "opacity-50" : "cursor-pointer hover:bg-gray-50/50"
                    }`}
                    onClick={() => !already && toggle(c._id)}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={already}
                      onCheckedChange={() => !already && toggle(c._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        {already && (
                          <span className="text-[10px] text-gray-400">כבר מצורף</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-gray-500">
                        {c.email && (
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Mail className="size-3" /> {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Phone className="size-3" /> {c.phone}
                          </span>
                        )}
                        {c.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" /> {c.city}
                          </span>
                        )}
                        {c.sectors && c.sectors.length > 0 && (
                          <span className="text-gray-400">{c.sectors.slice(0, 2).join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              נבחרו {selected.size} מועמדים
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selected.size === 0 || submitting}
                className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                צרף {selected.size > 0 && `(${selected.size})`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
