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

import { EditSchoolModal } from "./EditSchoolModal";
import { supabase } from "@/lib/supabase/lib/client";

// Normalizer biar table stabil walau struktur output RPC beda tipis
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

  const status = row?.status ?? row?.school_status ?? row?.type ?? "UNKNOWN";

  // ✅ jenjang harus utamakan meta_jenjang/meta.jenjang (pembeda TK vs PAUD)
  const jenjangRaw =
    row?.meta?.jenjang ?? row?.meta_jenjang ?? row?.jenjang ?? null;

  // Default aman:
  // - Kalau operatorType TK/PAUD dan jenjangRaw kosong, jangan “memaksa” jadi TK,
  //   lebih aman jatuh ke PAUD biar TK tidak ketarik salah.
  const jenjang =
    jenjangRaw ??
    (operatorType === "TK" || operatorType === "PAUD" ? "PAUD" : operatorType);

  const jumlahSiswa =
    row?.siswa?.jumlahSiswa ?? row?.student_count ?? row?.studentCount ?? 0;

  return {
    id: row?.id ?? npsn,
    npsn,
    namaSekolah,
    kecamatan,
    status,
    jenjang,
    schoolType: row?.schoolType ?? operatorType,
    siswa: {
      jumlahSiswa: Number(jumlahSiswa) || 0,
      ...(row?.siswa || {}),
    },
    ...row,
  };
}

export default function SchoolsTable({ operatorType }) {
  const [schoolsData, setSchoolsData] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchSchools = async () => {
      if (!operatorType) {
        setSchoolsData([]);
        setKecamatanList([]);
        setIsLoading(false);
        setLoadError("");
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const { data, error } = await supabase.rpc("get_schools_full_report", {
          jenjang_filter: operatorType,
        });

        if (error)
          throw new Error(error.message || "Gagal memuat data dari database");

        // ✅ Unwrap kalau function ngembaliin [{ row_json: [...] }]
        const rawOuter = Array.isArray(data) ? data : [];
        const raw =
          rawOuter.length === 1 && Array.isArray(rawOuter?.[0]?.row_json)
            ? rawOuter[0].row_json
            : rawOuter;

        let normalized = raw.map((r) => normalizeSchoolRow(r, operatorType));

        // ✅ Filter jelas (tanpa “hasJenjang” yang misleading)
        if (operatorType === "TK") {
          normalized = normalized.filter(
            (s) => String(s.jenjang || "").toUpperCase() === "TK"
          );
        } else if (operatorType === "PAUD") {
          normalized = normalized.filter(
            (s) => String(s.jenjang || "").toUpperCase() !== "TK"
          );
        }

        setSchoolsData(normalized);

        const uniqueKecamatan = [
          ...new Set(normalized.map((s) => s.kecamatan).filter(Boolean)),
        ].sort((a, b) => String(a).localeCompare(String(b), "id"));

        setKecamatanList(uniqueKecamatan);
      } catch (err) {
        console.error(`Error memuat data untuk ${operatorType}:`, err);
        setSchoolsData([]);
        setKecamatanList([]);
        setLoadError(err?.message || "Terjadi kesalahan saat memuat data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchools();
  }, [operatorType]);

  const filteredSchools = useMemo(() => {
    let filtered = schoolsData;

    if (selectedKecamatan !== "all") {
      filtered = filtered.filter(
        (school) => school.kecamatan === selectedKecamatan
      );
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (school) =>
          String(school.namaSekolah || "")
            .toLowerCase()
            .includes(lower) || String(school.npsn || "").includes(searchTerm)
      );
    }

    return filtered;
  }, [schoolsData, searchTerm, selectedKecamatan]);

  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSchools.slice(startIndex, endIndex);
  }, [filteredSchools, currentPage, itemsPerPage]);

  const totalPages = Math.ceil((filteredSchools.length || 0) / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedKecamatan, itemsPerPage]);

  const handleEditSchool = (school) => {
    setSelectedSchool(school);
    setIsEditModalOpen(true);
  };

  const handleSaveSchool = (updatedSchool) => {
    setSchoolsData((prevData) =>
      prevData.map((school) =>
        school.id === updatedSchool.id ? updatedSchool : school
      )
    );
  };

  const getTableTitle = () => `Data ${operatorType}`;
  const getSearchPlaceholder = () => `Cari nama sekolah atau NPSN...`;

  const getDetailHref = (opType, npsn) => {
    const seg = String(opType || "").toLowerCase();
    return `/dashboard/${seg}/${npsn}`;
  };

  return (
    <>
      <Card className="rounded-xl shadow-sm border border-border/60">
        <CardHeader className="border-b border-border/60 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SchoolIcon className="h-5 w-5 text-primary" />
              {getTableTitle()}
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Select
                value={selectedKecamatan}
                onValueChange={setSelectedKecamatan}
              >
                <SelectTrigger className="w-full sm:w-[200px] rounded-lg bg-background">
                  <SelectValue placeholder="Semua Kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kecamatan</SelectItem>
                  {kecamatanList.map((kec) => (
                    <SelectItem key={kec} value={kec}>
                      {kec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={getSearchPlaceholder()}
                  className="pl-10 rounded-lg w-full sm:w-64 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Memuat data sekolah...</p>
            </div>
          ) : loadError ? (
            <div className="text-center py-16">
              <div className="inline-block px-4 py-3 rounded-lg border border-destructive/30 text-destructive text-sm">
                {loadError}
              </div>
            </div>
          ) : paginatedSchools.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <SchoolIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="font-semibold mb-1">
                {searchTerm || selectedKecamatan !== "all"
                  ? "Tidak ada hasil yang cocok"
                  : `Data ${operatorType} tidak ditemukan`}
              </p>
              <p className="text-sm">
                Coba ubah filter atau kata kunci pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 pl-6">No.</TableHead>
                    <TableHead>Nama Sekolah</TableHead>
                    <TableHead>NPSN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Jumlah Siswa</TableHead>
                    <TableHead className="w-40 pr-6 text-center">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedSchools.map((school, index) => (
                    <TableRow
                      key={school.id}
                      className="hover:bg-muted/50 even:bg-muted/20"
                    >
                      <TableCell className="font-medium pl-6">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>

                      <TableCell className="font-medium">
                        <div>{school.namaSekolah}</div>
                        <div className="text-xs text-muted-foreground">
                          {school.kecamatan}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-sm">
                        {school.npsn}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-normal capitalize"
                        >
                          {String(school.status || "").toLowerCase()}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        {Number(school?.siswa?.jumlahSiswa || 0)}
                      </TableCell>

                      <TableCell className="pr-6">
                        <div className="flex gap-2 justify-center">
                          <Link href={getDetailHref(operatorType, school.npsn)}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detail
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => handleEditSchool(school)}
                            title="Edit Data"
                          >
                            <Edit className="h-4 w-4" />
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-top border-border/60">
            <div className="text-sm text-muted-foreground">
              Menampilkan <strong>{paginatedSchools.length}</strong> dari{" "}
              <strong>{filteredSchools.length}</strong> data
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Baris per halaman:</span>
                <Select
                  value={`${itemsPerPage}`}
                  onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[70px] bg-background">
                    <SelectValue placeholder={itemsPerPage} />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm font-medium">
                Halaman {currentPage} dari {totalPages}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-end">
        <Button className="rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Data Sekolah
        </Button>
      </div>

      <EditSchoolModal
        school={selectedSchool}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchool(null);
        }}
        onSave={handleSaveSchool}
      />
    </>
  );
}
