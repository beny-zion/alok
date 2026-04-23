"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Users,
  Loader2,
  UserX,
  MailX,
  Mail,
  Phone,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Pencil,
  Columns3,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  CandidateFilters,
  EMPTY_FILTERS,
  type CandidateFiltersState,
} from "./candidate-filters";
import { CandidateEditSheet } from "./candidate-edit-sheet";
import {
  getCandidates,
  getFilterOptions,
  getCandidateIds,
  deleteCandidate,
  syncCandidateToSmoove,
  type CandidateData,
  type FilterOptions,
} from "@/lib/api";
import { toast } from "sonner";

interface CandidateTableProps {
  onSelectionChange?: (ids: string[]) => void;
  initialFilters?: Partial<CandidateFiltersState>;
  // These filter keys are enforced on every change/reset — the user cannot
  // override them via the UI. The matching controls are also hidden.
  lockedFilters?: Partial<CandidateFiltersState>;
}

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "שם", defaultVisible: true },
  { key: "email", label: "אימייל", defaultVisible: true },
  { key: "phone", label: "טלפון", defaultVisible: true },
  { key: "city", label: "עיר", defaultVisible: true },
  { key: "sectors", label: "תחומים", defaultVisible: true },
  { key: "status", label: "סטטוס", defaultVisible: true },
  { key: "tags", label: "תגיות", defaultVisible: true },
  { key: "age", label: "גיל", defaultVisible: true },
  { key: "salary", label: "שכר", defaultVisible: true },
  { key: "registrationDate", label: "תאריך רישום", defaultVisible: true },
  { key: "createdAt", label: "נוצר במערכת", defaultVisible: true },
  { key: "jobType", label: "סוג משרה", defaultVisible: false },
  { key: "jobPermanence", label: "קביעות", defaultVisible: false },
  { key: "idNumber", label: "ת.ז.", defaultVisible: false },
  { key: "gender", label: "מין", defaultVisible: false },
  { key: "address", label: "כתובת", defaultVisible: false },
  { key: "placedJob", label: "משרה שסגרה", defaultVisible: false },
  { key: "placedCompany", label: "חברה שסגרה", defaultVisible: false },
  { key: "smooveStatus", label: "סטטוס Smoove", defaultVisible: false },
  { key: "source", label: "מקור", defaultVisible: false },
];

const STORAGE_KEY = "candidates-visible-columns-v1";

function defaultVisibleSet(): Set<string> {
  return new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
}

function loadVisibleColumns(): Set<string> {
  if (typeof window === "undefined") return defaultVisibleSet();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisibleSet();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr);
  } catch {}
  return defaultVisibleSet();
}

const SOURCE_LABELS: Record<string, string> = {
  "elementor-webhook": "אלמנטור",
  "csv-import": "CSV",
  manual: "ידני",
};

export function CandidateTable({ onSelectionChange, initialFilters, lockedFilters }: CandidateTableProps) {
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<CandidateFiltersState>({
    ...EMPTY_FILTERS,
    ...initialFilters,
    ...lockedFilters,
  });
  const lockedKeys = useMemo(
    () => (lockedFilters ? (Object.keys(lockedFilters) as Array<keyof CandidateFiltersState>) : []),
    [lockedFilters]
  );
  const [filterOptions, setFilterOptions] = useState<FilterOptions | undefined>();
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(defaultVisibleSet);
  const [hasMounted, setHasMounted] = useState(false);

  const [editingCandidate, setEditingCandidate] = useState<CandidateData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // Hydrate visible-columns from localStorage after mount (SSR has no window).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleColumns(loadVisibleColumns());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns, hasMounted]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const resetColumns = () => setVisibleColumns(defaultVisibleSet());

  const fetchFilterOptions = useCallback(async () => {
    const res = await getFilterOptions();
    if (res.success && res.data) setFilterOptions(res.data);
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const paramsFromFilters = useCallback(
    (pageNum?: number): Record<string, string> => {
      const out: Record<string, string> = {};
      if (pageNum) out.page = String(pageNum);
      out.limit = "20";
      for (const [k, v] of Object.entries(filters)) {
        if (v) out[k] = v;
      }
      return out;
    },
    [filters]
  );

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const res = await getCandidates(paramsFromFilters(page));
    if (res.success && res.data) {
      setCandidates(res.data.candidates);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, paramsFromFilters]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(candidates.map((c) => c._id)));
  };

  const selectAllAcrossFilter = async () => {
    const res = await getCandidateIds(paramsFromFilters());
    if (res.success && res.data) {
      setSelectedIds(new Set(res.data.ids));
      toast.success(`${res.data.total} מועמדים נבחרו לפי הסינון`);
    } else {
      toast.error("שגיאה בבחירת מועמדים");
    }
  };

  const openEdit = (c: CandidateData | null) => {
    setEditingCandidate(c);
    setSheetOpen(true);
  };

  const handleDelete = async (c: CandidateData) => {
    if (!confirm(`למחוק את ${c.firstName || c.fullName || c.email || "המועמד"}?`)) return;
    const res = await deleteCandidate(c._id);
    if (res.success) {
      toast.success("המועמד נמחק");
      fetchCandidates();
      fetchFilterOptions();
    } else {
      toast.error(res.error || "שגיאה במחיקה");
    }
  };

  const handleSync = async (c: CandidateData) => {
    if (!c.email) {
      toast.error("אין אימייל למועמד זה");
      return;
    }
    const res = await syncCandidateToSmoove(c._id);
    if (res.success) {
      toast.success("סונכרן ל-Smoove");
      fetchCandidates();
    } else {
      toast.error(res.error || "סנכרון נכשל");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} הועתק`),
      () => toast.error("שגיאה בהעתקה")
    );
  };

  const visibleColList = useMemo(
    () => COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns]
  );

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);
  const colspan = visibleColList.length + 2; // checkbox + actions

  return (
    <div className="space-y-4">
      <CandidateFilters
        filters={filters}
        filterOptions={filterOptions}
        lockedKeys={lockedKeys}
        onChange={(f) => { setFilters({ ...f, ...lockedFilters }); setPage(1); }}
        onReset={() => { setFilters({ ...EMPTY_FILTERS, ...lockedFilters }); setPage(1); }}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="size-4 text-gray-400" />
            <span className="font-medium text-gray-900">{total}</span>
            <span>מועמדים</span>
          </div>
          {selectedIds.size > 0 && <div className="h-4 w-px bg-gray-300" />}
          {selectedIds.size > 0 && (
            <span className="text-sm text-[#2563EB] font-medium">
              {selectedIds.size} נבחרו
            </span>
          )}
          {total > candidates.length && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-[#2563EB] hover:text-[#1B1464]"
              onClick={selectAllAcrossFilter}
            >
              בחר הכל ({total})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                />
              }
            >
              <Columns3 className="size-3.5" />
              עמודות
              <span className="text-gray-400">({visibleColList.length})</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                עמודות גלויות
              </div>
              <DropdownMenuSeparator />
              {COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.has(col.key)}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleColumn(col.key);
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetColumns}>איפוס לברירת מחדל</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-1.5 h-8 text-xs shadow-sm"
            onClick={() => openEdit(null)}
          >
            <Plus className="size-3.5" />
            הוסף מועמד
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-200 hover:bg-gray-50/80">
              <TableHead className="w-12 pr-4">
                <Checkbox
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {visibleColList.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colspan} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="size-6 animate-spin" />
                    <span className="text-sm">טוען מועמדים...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colspan} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <UserX className="size-8" strokeWidth={1.5} />
                    <span className="text-sm font-medium">לא נמצאו מועמדים</span>
                    <span className="text-xs">נסה לשנות את הסינון או הוסף מועמד חדש</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((c) => {
                const isSelected = selectedIds.has(c._id);
                return (
                  <TableRow
                    key={c._id}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-gray-50/70"
                    }`}
                    onClick={() => openEdit(c)}
                  >
                    <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(c._id)}
                      />
                    </TableCell>
                    {visibleColList.map((col) => (
                      <TableCell
                        key={col.key}
                        className="text-sm text-gray-600 whitespace-nowrap max-w-[280px] truncate"
                      >
                        <CellContent col={col.key} c={c} />
                      </TableCell>
                    ))}
                    <TableCell
                      className="w-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        c={c}
                        onEdit={() => openEdit(c)}
                        onDelete={() => handleDelete(c)}
                        onSync={() => handleSync(c)}
                        onCopy={copyToClipboard}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              מציג {startItem}–{endItem} מתוך {total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7" disabled={page <= 1} onClick={() => setPage(1)}>
                <ChevronsRight className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
              <span className="text-xs text-gray-600 min-w-[80px] text-center">
                עמוד {page} מתוך {totalPages}
              </span>
              <Button variant="ghost" size="icon" className="size-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsLeft className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CandidateEditSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingCandidate(null);
        }}
        candidate={editingCandidate}
        onSaved={() => {
          fetchCandidates();
          fetchFilterOptions();
        }}
        onDeleted={() => {
          fetchCandidates();
          fetchFilterOptions();
        }}
      />
    </div>
  );
}

function CellContent({ col, c }: { col: string; c: CandidateData }) {
  switch (col) {
    case "name":
      return (
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-[#1B1464]/8 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-[#1B1464]">
              {(c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "") || "?"}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900 truncate">
            {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.fullName || "—"}
          </span>
        </div>
      );
    case "email":
      return c.email ? (
        <span dir="ltr" className="text-gray-500 truncate">{c.email}</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
          <MailX className="size-3" />
          ללא מייל
        </span>
      );
    case "phone":
      return c.phone ? (
        <span dir="ltr" className="tabular-nums text-gray-500">{c.phone}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    case "city":
      return <span>{c.city || "—"}</span>;
    case "sectors":
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(c.sectors || []).slice(0, 2).map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="text-[11px] font-normal bg-gray-100 text-gray-600 hover:bg-gray-100"
            >
              {s}
            </Badge>
          ))}
          {(c.sectors?.length ?? 0) > 2 && (
            <Badge variant="outline" className="text-[11px] font-normal text-gray-400 border-gray-200">
              +{(c.sectors?.length ?? 0) - 2}
            </Badge>
          )}
          {(c.sectors?.length ?? 0) === 0 && <span className="text-gray-300">—</span>}
        </div>
      );
    case "status":
      return c.status ? (
        <Badge variant="outline" className="text-[11px] font-normal">
          {c.status}
        </Badge>
      ) : (
        <span className="text-gray-300">—</span>
      );
    case "tags":
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(c.tags || []).slice(0, 2).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="text-[11px] font-normal text-indigo-700 border-indigo-200 bg-indigo-50/60"
            >
              {t}
            </Badge>
          ))}
          {(c.tags?.length ?? 0) > 2 && (
            <Badge variant="outline" className="text-[11px] font-normal text-gray-400 border-gray-200">
              +{(c.tags?.length ?? 0) - 2}
            </Badge>
          )}
          {(c.tags?.length ?? 0) === 0 && <span className="text-gray-300">—</span>}
        </div>
      );
    case "age":
      return c.age != null ? (
        <span className="tabular-nums">{c.age}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    case "salary":
      return c.salaryExpectation != null ? (
        <span className="tabular-nums" dir="ltr">₪{c.salaryExpectation.toLocaleString("he-IL")}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    case "registrationDate":
      return c.registrationDate ? (
        <span className="tabular-nums text-gray-500">
          {new Date(c.registrationDate).toLocaleDateString("he-IL")}
        </span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    case "createdAt":
      return (
        <span className="tabular-nums text-gray-400">
          {new Date(c.createdAt).toLocaleDateString("he-IL")}
        </span>
      );
    case "jobType":
      return <span>{c.jobType || "—"}</span>;
    case "jobPermanence":
      return <span>{c.jobPermanence || "—"}</span>;
    case "idNumber":
      return c.idNumber ? <span dir="ltr">{c.idNumber}</span> : <span className="text-gray-300">—</span>;
    case "gender":
      return <span>{c.gender || "—"}</span>;
    case "address":
      return <span>{c.address || "—"}</span>;
    case "placedJob":
      return <span>{c.placedJob || "—"}</span>;
    case "placedCompany":
      return <span>{c.placedCompany || "—"}</span>;
    case "smooveStatus":
      return <SmooveCellBadge c={c} />;
    case "source":
      return c.source ? (
        <Badge variant="outline" className="text-[11px] font-normal text-gray-500">
          {SOURCE_LABELS[c.source] || c.source}
        </Badge>
      ) : (
        <span className="text-gray-300">—</span>
      );
    default:
      return <span className="text-gray-300">—</span>;
  }
}

function SmooveCellBadge({ c }: { c: CandidateData }) {
  if (!c.email) {
    return (
      <Badge variant="outline" className="text-[11px] text-gray-500 border-gray-200 gap-1">
        <MailX className="size-3" />
        ללא מייל
      </Badge>
    );
  }
  if (c.smooveError) {
    return (
      <Badge variant="outline" className="text-[11px] text-red-700 border-red-200 bg-red-50 gap-1">
        <AlertTriangle className="size-3" />
        שגיאה
      </Badge>
    );
  }
  if (c.smooveSynced) {
    return (
      <Badge variant="outline" className="text-[11px] text-emerald-700 border-emerald-200 bg-emerald-50 gap-1">
        <CheckCircle2 className="size-3" />
        סונכרן
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-200 bg-amber-50 gap-1">
      <Clock className="size-3" />
      ממתין
    </Badge>
  );
}

function RowActions({
  c,
  onEdit,
  onDelete,
  onSync,
  onCopy,
}: {
  c: CandidateData;
  onEdit: () => void;
  onDelete: () => void;
  onSync: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-60 hover:opacity-100"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-3.5" />
          ערוך
        </DropdownMenuItem>
        {c.email && (
          <DropdownMenuItem onClick={onSync}>
            <RefreshCw className="size-3.5" />
            סנכרן ל-Smoove
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {c.email && (
          <DropdownMenuItem onClick={() => onCopy(c.email!, "האימייל")}>
            <Mail className="size-3.5" />
            העתק מייל
          </DropdownMenuItem>
        )}
        {c.phone && (
          <DropdownMenuItem onClick={() => onCopy(c.phone!, "הטלפון")}>
            <Phone className="size-3.5" />
            העתק טלפון
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          מחק
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
