// src/app/components/SchoolsTable.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

import {
  School as SchoolIcon,
  Search,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  FileX2,
  Trash2,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { supabase } from "@/lib/supabase/lib/client";

/* =========================
   CUSTOM HOOK & HELPERS
========================= */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Logika sinkronisasi data siswa dari database asli
function computeJumlahSiswa(row) {
  // 1. Prioritas: Ambil student_count dari tabel schools
  const dbCount = toNum(row?.student_count);
  if (dbCount > 0) return dbCount;

  // 2. Fallback: Ambil dari nested object 'siswa' yang dibangun RPC
  const metaCount = toNum(row?.siswa?.jumlahSiswa);
  if (metaCount > 0) return metaCount;

  // 3. Fallback: Hitung manual dari gender
  return toNum(row?.st_male) + toNum(row?.st_female);
}

// Normalisasi Row agar data yang muncul di UI sesuai dengan kolom database
function normalizeSchoolRow(row, operatorType) {
  const meta = row?.meta || {};
  const npsn = String(row?.npsn || row?.id || "").trim();

  // Ambil nama dari 'namaSekolah' (alias di RPC) atau 'name'
  const namaSekolah = row?.namaSekolah || row?.name || "Tanpa Nama";

  // Kecamatan sekarang diambil dari field 'kecamatan' hasil COALESCE di RPC
  const kecamatan = row?.kecamatan || meta.kecamatan || "-";

  let statusRaw = row?.status || "SWASTA";
  const status = statusRaw.toUpperCase() === "NEGERI" ? "NEGERI" : "SWASTA";

  // LOGIC JENJANG: Prioritaskan data spesifik row (misal: 'TK') daripada operatorType ('PAUD')
  // Ini agar di tabel gabungan, kita tetap tahu mana yang TK mana yang PAUD.
  const jenjang =
    row?.schoolType ||
    row?.type_code ||
    row?.jenjang ||
    meta.jenjang ||
    operatorType;

  return {
    ...row,
    id: row?.id || npsn,
    npsn,
    namaSekolah,
    kecamatan,
    status,
    jenjang, // Field ini akan berisi "TK", "PAUD", "SD", dll sesuai data baris
    jumlahSiswa: computeJumlahSiswa(row),
  };
}

function toDashboardBaseFromJenjangOrOperator({ operatorType, jenjang }) {
  const op = String(operatorType || "").toUpperCase();

  // LOGIC GABUNGAN: Jika operatorType adalah PAUD (atau TK), kita arahkan ke base URL 'paud'.
  // Ini menyatukan routing detail/edit agar konsisten di folder /dashboard/paud/
  if (op === "PAUD" || op === "TK") {
    return "paud";
  }

  // Untuk jenjang lain (SD, SMP) tetap sesuai operatorType
  return op.toLowerCase();
}

function SchoolTableSkeleton() {
  return (
    <div className="w-full">
      <div className="border-b p-4 bg-gray-50/50">
        <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse mb-0" />
      </div>
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-100 rounded animate-pulse" />
            <div className="h-10 flex-1 bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ isFilterActive, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-gray-50 p-4 rounded-full mb-4">
        <FileX2 className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        Data tidak ditemukan
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
        {isFilterActive
          ? "Coba ubah kata kunci pencarian atau filter kecamatan Anda."
          : "Belum ada data sekolah yang tersedia."}
      </p>
      {isFilterActive && (
        <Button variant="outline" onClick={onReset}>
          Reset Filter
        </Button>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  columnKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}) {
  const isActive = currentSortBy === columnKey;

  return (
    <TableHead
      className={`cursor-pointer hover:bg-gray-100/50 transition-colors select-none group ${className}`}
      onClick={() => onSort(columnKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive ? (
          currentSortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}

export default function SchoolsTable({ operatorType }) {
  const [schoolsData, setSchoolsData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedKecamatan, setSelectedKecamatan] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortBy, setSortBy] = useState("kecamatan");
  const [sortOrder, setSortOrder] = useState("asc");

  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchKecamatan = async () => {
      try {
        const res = await fetch("/data/desa-garut.json");
        if (res.ok) {
          const data = await res.json();
          if (data?.kecamatan)
            setKecamatanList(
              data.kecamatan.map((k) => k.nama_kecamatan).sort()
            );
        }
      } catch (e) {
        console.error("Gagal load kecamatan", e);
      }
    };
    fetchKecamatan();
  }, []);

  const fetchSchools = async () => {
    if (!operatorType) return;
    setIsLoading(true);
    setLoadError("");

    try {
      // ✅ LOGGING UNTUK DEBUGGING
      console.log("Fetching with params:", {
        jenjang_filter: operatorType, // Mengirim "PAUD" untuk mengambil gabungan (sesuai asumsi RPC menangani ini)
        page_number: currentPage,
        page_size: itemsPerPage,
        search_query: debouncedSearch,
        kecamatan_filter: selectedKecamatan,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const { data, error } = await supabase.rpc("get_schools_paginated", {
        jenjang_filter: operatorType,
        page_number: currentPage,
        page_size: itemsPerPage,
        search_query: debouncedSearch,
        kecamatan_filter: selectedKecamatan,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (data && data.length > 0) {
        setTotalCount(Number(data[0].total_count) || 0);
        const normalized = data.map((d) =>
          normalizeSchoolRow(d.row_json, operatorType)
        );
        setSchoolsData(normalized);
      } else {
        setTotalCount(0);
        setSchoolsData([]);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setLoadError(`Gagal memuat data: ${err.message || "Kesalahan sistem"}`);
      setSchoolsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [
    operatorType,
    currentPage,
    debouncedSearch,
    selectedKecamatan,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedKecamatan]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleResetFilter = () => {
    setSearchTerm("");
    setSelectedKecamatan("all");
    setSortBy("kecamatan");
    setSortOrder("asc");
  };

  const getDetailHref = (opType, npsn, jenjang) =>
    `/dashboard/${toDashboardBaseFromJenjangOrOperator({
      operatorType: opType,
      jenjang,
    })}/${npsn}`;

  const getEditHref = (opType, npsn, jenjang) =>
    `/dashboard/${toDashboardBaseFromJenjangOrOperator({
      operatorType: opType,
      jenjang,
    })}/edit/${npsn}`;

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_school_secure", {
        p_school_id: deleteId,
      });
      if (error) throw error;
      toast.success("Data sekolah berhasil dihapus permanen");
      setDeleteId(null);
      fetchSchools();
    } catch (err) {
      toast.error("Gagal menghapus: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <>
      <Card className="rounded-xl border shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b p-4 sm:p-6 bg-white">
          <div className="flex flex-col xl:flex-row justify-between gap-4 items-start xl:items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Data {operatorType === "PAUD" ? "PAUD" : operatorType}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Total {totalCount} sekolah ditemukan
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              <Select
                value={selectedKecamatan}
                onValueChange={setSelectedKecamatan}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue>
                    {selectedKecamatan === "all"
                      ? "Semua Kecamatan"
                      : selectedKecamatan}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kecamatan</SelectItem>
                  {kecamatanList.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Cari NPSN atau Sekolah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <SchoolTableSkeleton />
          ) : loadError ? (
            <div className="py-20 text-center text-red-600 bg-red-50 mx-4 my-4 rounded-lg border border-red-100">
              <p className="font-semibold">{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={fetchSchools}
              >
                Coba Lagi
              </Button>
            </div>
          ) : schoolsData.length === 0 ? (
            <EmptyState
              isFilterActive={searchTerm || selectedKecamatan !== "all"}
              onReset={handleResetFilter}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-16 pl-6">No</TableHead>
                    <SortableHeader
                      label="Nama Sekolah"
                      columnKey="namaSekolah"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      className="min-w-[250px]"
                    />
                    <SortableHeader
                      label="NPSN"
                      columnKey="npsn"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead className="w-[100px]">Jenjang</TableHead>
                    <SortableHeader
                      label="Status"
                      columnKey="status"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Jumlah Siswa"
                      columnKey="siswa"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      className="text-center justify-center"
                    />
                    <TableHead className="text-center w-[160px] pr-6">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schoolsData.map((s, i) => (
                    <TableRow
                      key={s.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell className="pl-6 font-medium text-gray-500">
                        {(currentPage - 1) * itemsPerPage + i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">
                          {s.namaSekolah}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                          {s.kecamatan}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {s.npsn}
                      </TableCell>
                      <TableCell>
                        {/* Menampilkan Jenjang Spesifik (TK/PAUD) */}
                        <Badge variant="outline" className="font-mono text-xs">
                          {s.jenjang}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${
                            s.status === "NEGERI"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          } border font-normal`}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium text-gray-700">
                        {s.jumlahSiswa.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={getDetailHref(
                              operatorType,
                              s.npsn,
                              s.jenjang
                            )}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-gray-600 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4 mr-1.5" /> Detail
                            </Button>
                          </Link>
                          <Link
                            href={getEditHref(operatorType, s.npsn, s.jenjang)}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-orange-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            onClick={() => setDeleteId(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {!isLoading && totalPages > 1 && (
          <div className="border-t bg-gray-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-gray-500">
              Halaman{" "}
              <span className="font-medium text-gray-900">{currentPage}</span>{" "}
              dari {totalPages}
            </span>
            <div className="flex gap-1.5">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-white"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-white"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-white"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-white"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Hapus Data Sekolah?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data sekolah beserta data
              siswa, guru, dan sarpras terkait akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ya, Hapus Permanen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
