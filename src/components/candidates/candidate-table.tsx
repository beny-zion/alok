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
import { PlusIcon } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <CandidateFilters
        filters={filters}
        filterOptions={filterOptions}
        onChange={(f) => { setFilters(f); setPage(1); }}
        onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} מועמדים | {selectedIds.size} נבחרו</span>
        <Button
          size="sm"
          className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white"
          onClick={() => setShowAddDialog(true)}
        >
          <PlusIcon className="size-4 ml-1" />
          הוסף מועמד
        </Button>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1B1464]/5 hover:bg-[#1B1464]/5">
              <TableHead className="w-12">
                <Checkbox
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold">שם</TableHead>
              <TableHead className="font-semibold">אימייל</TableHead>
              <TableHead className="font-semibold">טלפון</TableHead>
              <TableHead className="font-semibold">עיר</TableHead>
              <TableHead className="font-semibold">תחומים</TableHead>
              <TableHead className="font-semibold">סוג משרה</TableHead>
              <TableHead className="font-semibold">תאריך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  טוען...
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  לא נמצאו מועמדים
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((c, index) => {
                const isSelected = selectedIds.has(c._id);
                return (
                  <TableRow
                    key={c._id}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#2563EB]/5 hover:bg-[#2563EB]/10"
                        : index % 2 === 1
                          ? "bg-muted/20 hover:bg-muted/40"
                          : "hover:bg-muted/30"
                    }`}
                    onClick={() => setDetailCandidate(c)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(c._id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="text-sm" dir="ltr">{c.phone}</TableCell>
                    <TableCell className="text-sm">{c.city || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.sectors?.slice(0, 2).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                        {c.sectors?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{c.sectors.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.jobType || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            הקודם
          </Button>
          <span className="text-sm text-muted-foreground">
            עמוד {page} מתוך {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            הבא
          </Button>
        </div>
      )}

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
