"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

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
  School as SchoolIcon,
  Search,
  Edit,
  Eye,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { supabase } from "@/lib/supabase/lib/client";

/* =========================
   Helpers
========================= */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumLP = (maybeLp) => {
  if (!maybeLp || typeof maybeLp !== "object") return null;
  return toNum(maybeLp.l) + toNum(maybeLp.p);
};

function computeJumlahSiswa(row) {
  const fromStudentCount = toNum(row?.student_count);
  if (fromStudentCount > 0) return fromStudentCount;

  const fromMaleFemale = toNum(row?.st_male) + toNum(row?.st_female);
  if (fromMaleFemale > 0) return fromMaleFemale;

  const sj = row?.siswa?.jumlahSiswa;
  const sjNum = toNum(sj);
  if (sjNum > 0) return sjNum;

  const sjObj = sumLP(sj);
  if (sjObj > 0) return sjObj;

  const siswaObj = row?.siswa;
  if (siswaObj && typeof siswaObj === "object") {
    let total = 0;
    for (const [k, v] of Object.entries(siswaObj)) {
      if (k === "jumlahSiswa") continue;
      const part = sumLP(v);
      if (typeof part === "number") total += part;
    }
    if (total > 0) return total;
  }

  return 0;
}

function normalizeSchoolRow(row, operatorType) {
  const npsn = String(row?.npsn ?? row?.id ?? "").trim();

  const namaSekolah =
    row?.namaSekolah ??
    row?.name ??
    row?.school_name ??
    row?.nama_sekolah ??
    "";

  const kecamatan =
    row?.kecamatan ??
    row?.meta?.kecamatan ??
    row?.location?.subdistrict ??
    row?.subdistrict ??
    "";

  const status = row?.status ?? "UNKNOWN";

  const jenjangRaw =
    row?.meta?.jenjang ?? row?.meta_jenjang ?? row?.jenjang ?? null;

  const jenjang =
    jenjangRaw ??
    (operatorType === "TK"
      ? "TK"
      : operatorType === "PAUD"
      ? "PAUD"
      : operatorType);

  const jumlahSiswa = computeJumlahSiswa(row);

  return {
    ...row,
    id: row?.id ?? npsn,
    npsn,
    namaSekolah,
    kecamatan,
    status,
    jenjang,
    schoolType: operatorType,
    siswa: {
      ...(row?.siswa && typeof row.siswa === "object" ? row.siswa : {}),
      jumlahSiswa,
    },
  };
}

function toDashboardBaseFromJenjangOrOperator({ operatorType, jenjang }) {
  const op = String(operatorType || "").toUpperCase();
  const j = String(jenjang || "").toUpperCase();

  // Kalau halaman tabel PAUD/TK, penentuan base paling akurat dari jenjang barisnya
  if (op === "PAUD" || op === "TK") {
    if (j === "TK") return "tk";
    return "paud"; // selain TK dianggap PAUD
  }

  // Jenjang lain langsung pakai operatorType
  return op.toLowerCase();
}

/* =========================
   Component
========================= */
export default function SchoolsTable({ operatorType }) {
  const [schoolsData, setSchoolsData] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /* ===== Fetch ===== */
  useEffect(() => {
    let alive = true; // guard

    const fetchSchools = async () => {
      if (!operatorType) {
        if (!alive) return;
        setSchoolsData([]);
        setKecamatanList([]);
        setIsLoading(false);
        return;
      }

      if (!alive) return;
      setIsLoading(true);
      setLoadError("");

      try {
        const rpcFilter = operatorType; // TK => TK, PAUD => PAUD


        const { data, error } = await supabase.rpc("get_schools_full_report", {
          jenjang_filter: rpcFilter,
        });
        if (error) throw error;

        if (!alive) return; // <--- ini penting

        const rawOuter = Array.isArray(data) ? data : [];
        const raw =
          rawOuter.length === 1 && Array.isArray(rawOuter[0]?.row_json)
            ? rawOuter[0].row_json
            : rawOuter;
        console.log("[SchoolsTable] operatorType:", operatorType);
        console.log("[SchoolsTable] raw[0]:", raw?.[0]);
        console.log("[SchoolsTable] raw[0].meta:", raw?.[0]?.meta);
        console.log("[SchoolsTable] raw jenjang candidates:", {
          metaJenjang: raw?.[0]?.meta?.jenjang,
          meta_jenjang: raw?.[0]?.meta_jenjang,
          jenjang: raw?.[0]?.jenjang,
        });

        let normalized = raw.map((r) => normalizeSchoolRow(r, operatorType));

        if (operatorType === "TK") {
          normalized = normalized.filter(
            (s) => String(s.jenjang).toUpperCase() === "TK"
          );
        } else if (operatorType === "PAUD") {
          normalized = normalized.filter(
            (s) => String(s.jenjang).toUpperCase() !== "TK"
          );
        }

        setSchoolsData(normalized);

        const kecs = [
          ...new Set(normalized.map((s) => s.kecamatan).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b, "id"));

        setKecamatanList(kecs);
      } catch (err) {
        console.error(err);
        setLoadError(err?.message || "Gagal memuat data");
        setSchoolsData([]);
        setKecamatanList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchools();
    return () => {
      alive = false; // request lama nggak boleh update state lagi
    };
  }, [operatorType]);

  /* ===== Filter + Paging ===== */
  const filteredSchools = useMemo(() => {
    let res = schoolsData;

    if (selectedKecamatan !== "all") {
      res = res.filter((s) => s.kecamatan === selectedKecamatan);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      res = res.filter(
        (s) =>
          s.namaSekolah.toLowerCase().includes(q) ||
          String(s.npsn).includes(searchTerm)
      );
    }

    return res;
  }, [schoolsData, searchTerm, selectedKecamatan]);

  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchools.slice(start, start + itemsPerPage);
  }, [filteredSchools, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedKecamatan, itemsPerPage]);

  const getDetailHref = (opType, npsn, jenjang) => {
    const base = toDashboardBaseFromJenjangOrOperator({
      operatorType: opType,
      jenjang,
    });
    return `/dashboard/${base}/${npsn}`;
  };

  const getEditHref = (opType, npsn, jenjang) => {
    const base = toDashboardBaseFromJenjangOrOperator({
      operatorType: opType,
      jenjang,
    });
    return `/dashboard/${base}/edit/${npsn}`;
  };

  /* ===== Render ===== */
  return (
    <>
      <Card className="rounded-xl border">
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5 text-primary" />
              Data {operatorType}
            </CardTitle>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* === PERBAIKAN DROPDOWN DINAMIS === */}
              <Select
                value={selectedKecamatan}
                onValueChange={setSelectedKecamatan}
              >
                <SelectTrigger className="w-[200px]">
                  {/* Senior Tip: 
                      Kita pasang child di dalam SelectValue untuk override text default.
                      Jika 'all', tampilkan "Pilih Kecamatan".
                      Jika ada isi, tampilkan nama kecamatannya.
                  */}
                  <SelectValue>
                    {selectedKecamatan === "all"
                      ? "Pilih Kecamatan" 
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
              {/* ================================== */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 w-64"
                  placeholder="Cari nama sekolah atau NPSN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              Memuat data...
            </div>
          ) : loadError ? (
            <div className="py-16 text-center text-destructive">
              {loadError}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 pl-6">No</TableHead>
                    <TableHead>Nama Sekolah</TableHead>
                    <TableHead>NPSN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Jumlah Siswa</TableHead>
                    <TableHead className="text-center w-40 pr-6">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedSchools.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="pl-6">
                        {(currentPage - 1) * itemsPerPage + i + 1}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">{s.namaSekolah}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.kecamatan}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-sm">
                        {s.npsn}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {String(s.status).toLowerCase()}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        {toNum(s?.siswa?.jumlahSiswa)}
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
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Detail
                            </Button>
                          </Link>

                          <Link
                            href={getEditHref(operatorType, s.npsn, s.jenjang)}
                            title="Edit Data"
                          >
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4">
            <span className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </span>

            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>


    </>
  );
}
