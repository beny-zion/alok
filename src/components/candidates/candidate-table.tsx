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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Users,
  Loader2,
  UserX,
} from "lucide-react";
import { CandidateFilters } from "./candidate-filters";
import { CandidateDetailDialog } from "./candidate-detail-dialog";
import { CandidateFormDialog } from "./candidate-form-dialog";
import { getCandidates, getFilterOptions, type CandidateData, type FilterOptions } from "@/lib/api";

interface CandidateTableProps {
  onSelectionChange?: (ids: string[]) => void;
}

const EMPTY_FILTERS = { search: "", city: "", sector: "", gender: "", jobType: "" };

export function CandidateTable({ onSelectionChange }: CandidateTableProps) {
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | undefined>();

  // Dialog state
  const [detailCandidate, setDetailCandidate] = useState<CandidateData | null>(null);
  const [editCandidate, setEditCandidate] = useState<CandidateData | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    const res = await getFilterOptions();
    if (res.success && res.data) {
      setFilterOptions(res.data);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (filters.search) params.search = filters.search;
    if (filters.city) params.city = filters.city;
    if (filters.sector) params.sector = filters.sector;
    if (filters.gender) params.gender = filters.gender;
    if (filters.jobType) params.jobType = filters.jobType;

    const res = await getCandidates(params);
    if (res.success && res.data) {
      setCandidates(res.data.candidates);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
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
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c._id)));
    }
  };

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);

  return (
    <div className="space-y-4">
      <CandidateFilters
        filters={filters}
        filterOptions={filterOptions}
        onChange={(f) => { setFilters(f); setPage(1); }}
        onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
      />

      {/* Toolbar row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="size-4 text-gray-400" />
            <span className="font-medium text-gray-900">{total}</span>
            <span>מועמדים</span>
          </div>
          {selectedIds.size > 0 && (
            <div className="h-4 w-px bg-gray-300" />
          )}
          {selectedIds.size > 0 && (
            <span className="text-sm text-[#2563EB] font-medium">
              {selectedIds.size} נבחרו
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white gap-1.5 h-8 text-xs shadow-sm"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="size-3.5" />
          הוסף מועמד
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 border-b border-gray-200 hover:bg-gray-50/80">
              <TableHead className="w-12 pr-4">
                <Checkbox
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">שם</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">אימייל</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">טלפון</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">עיר</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">תחומים</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">סוג משרה</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="size-6 animate-spin" />
                    <span className="text-sm">טוען מועמדים...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
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
                      isSelected
                        ? "bg-blue-50/60 hover:bg-blue-50"
                        : "hover:bg-gray-50/70"
                    }`}
                    onClick={() => setDetailCandidate(c)}
                  >
                    <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(c._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-[#1B1464]/8 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#1B1464]">
                            {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {c.firstName} {c.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{c.email}</TableCell>
                    <TableCell className="text-sm text-gray-500 tabular-nums" dir="ltr">{c.phone}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.city || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.sectors?.slice(0, 2).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[11px] font-normal bg-gray-100 text-gray-600 hover:bg-gray-100"
                          >
                            {s}
                          </Badge>
                        ))}
                        {c.sectors?.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-normal text-gray-400 border-gray-200"
                          >
                            +{c.sectors.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{c.jobType || "—"}</TableCell>
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {new Date(c.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              מציג {startItem}–{endItem} מתוך {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsRight className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <span className="text-xs text-gray-600 min-w-[80px] text-center">
                עמוד {page} מתוך {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <CandidateDetailDialog
        open={!!detailCandidate}
        onOpenChange={(open) => { if (!open) setDetailCandidate(null); }}
        candidate={detailCandidate}
        onEdit={(c) => {
          setDetailCandidate(null);
          setEditCandidate(c);
        }}
        onDelete={() => {
          setDetailCandidate(null);
          fetchCandidates();
          fetchFilterOptions();
        }}
      />

      {/* Add / Edit Form Dialog */}
      <CandidateFormDialog
        open={showAddDialog || !!editCandidate}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditCandidate(null);
          }
        }}
        candidate={editCandidate}
        onSuccess={() => { fetchCandidates(); fetchFilterOptions(); }}
      />
    </div>
  );
}
