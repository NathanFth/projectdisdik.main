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

// --- KONFIGURASI FILE DATA ---
const DATA_FILES = {
  SD: "/data/sd_new.json",
  PAUD: "/data/paud.json",
  PKBM: "/data/pkbm.json",
  TK: "/data/paud.json",
  SMP: "/data/smp.json",
};

// --- DATA KOSONG SEBAGAI PENGAMAN (PLACEHOLDER) ---
const EMPTY_SISWA_DETAIL = {
  kelas1: { l: 0, p: 0 },
  kelas2: { l: 0, p: 0 },
  kelas3: { l: 0, p: 0 },
  kelas4: { l: 0, p: 0 },
  kelas5: { l: 0, p: 0 },
  kelas6: { l: 0, p: 0 },
  kelas7: { l: 0, p: 0 },
  kelas8: { l: 0, p: 0 },
  kelas9: { l: 0, p: 0 },
};

const EMPTY_GURU_DETAIL = {
  jumlahGuru: 0,
  pns: 0,
  pppk: 0,
  pppkParuhWaktu: 0,
  nonAsnDapodik: 0,
  nonAsnTidakDapodik: 0,
  kekuranganGuru: 0,
};

// --- FUNGSI TRANSFORMASI (FALLBACK JSON) ---
const transformSdData = (schoolData, schoolType) => {
  const allSchools = Object.entries(schoolData).flatMap(
    ([kecamatanName, schoolsInKecamatan]) =>
      schoolsInKecamatan.map((school) => ({
        ...school,
        kecamatan: kecamatanName,
      }))
  );

  return allSchools.map((school) => ({
    id: school.npsn,
    namaSekolah: school.name,
    npsn: school.npsn,
    kecamatan: school.kecamatan,
    status: school.type,
    schoolType: schoolType,
    jenjang: schoolType,
    dataStatus:
      (parseInt(school.student_count, 10) || 0) > 0
        ? "Aktif"
        : "Data Belum Lengkap",
    st_male: Object.keys(school.classes || {})
      .filter((k) => k.endsWith("_L"))
      .reduce((sum, key) => sum + (school.classes[key] || 0), 0),
    st_female: Object.keys(school.classes || {})
      .filter((k) => k.endsWith("_P"))
      .reduce((sum, key) => sum + (school.classes[key] || 0), 0),
    siswa: {
      jumlahSiswa: parseInt(school.student_count, 10) || 0,
      kelas1: {
        l: parseInt(school.classes?.["1_L"], 10) || 0,
        p: parseInt(school.classes?.["1_P"], 10) || 0,
      },
      kelas2: {
        l: parseInt(school.classes?.["2_L"], 10) || 0,
        p: parseInt(school.classes?.["2_P"], 10) || 0,
      },
      kelas3: {
        l: parseInt(school.classes?.["3_L"], 10) || 0,
        p: parseInt(school.classes?.["3_P"], 10) || 0,
      },
      kelas4: {
        l: parseInt(school.classes?.["4_L"], 10) || 0,
        p: parseInt(school.classes?.["4_P"], 10) || 0,
      },
      kelas5: {
        l: parseInt(school.classes?.["5_L"], 10) || 0,
        p: parseInt(school.classes?.["5_P"], 10) || 0,
      },
      kelas6: {
        l: parseInt(school.classes?.["6_L"], 10) || 0,
        p: parseInt(school.classes?.["6_P"], 10) || 0,
      },
    },
    rombel: {
      kelas1: school.rombel?.["1"] || 0,
      kelas2: school.rombel?.["2"] || 0,
      kelas3: school.rombel?.["3"] || 0,
      kelas4: school.rombel?.["4"] || 0,
      kelas5: school.rombel?.["5"] || 0,
      kelas6: school.rombel?.["6"] || 0,
    },
    prasarana: {
      ukuran: {
        tanah: school.facilities?.land_area,
        bangunan: school.facilities?.building_area,
        halaman: school.facilities?.yard_area,
      },
      ruangKelas: {
        jumlah: school.class_condition?.total_room,
        baik: school.class_condition?.classrooms_good,
        rusakSedang: school.class_condition?.classrooms_moderate_damage,
        rusakBerat: school.class_condition?.classrooms_heavy_damage,
      },
      ruangPerpustakaan: school.library,
      ruangLaboratorium: school.laboratory,
      ruangGuru: school.teacher_room,
      ruangUks: school.uks_room,
      toiletGuruSiswa: school.toilets,
      rumahDinas: school.official_residences,
      mebeulair: school.furniture,
    },
    guru: EMPTY_GURU_DETAIL,
    siswaAbk: {},
    kelembagaan: {},
  }));
};

const transformPaudData = (schoolData, schoolType) => {
  const allSchools = Object.entries(schoolData).flatMap(
    ([kecamatanName, schoolsInKecamatan]) =>
      schoolsInKecamatan.map((school) => ({
        ...school,
        kecamatan: kecamatanName,
        jenjang: school.type,
      }))
  );

  return allSchools.map((school) => ({
    id: school.npsn,
    namaSekolah: school.name,
    npsn: school.npsn,
    kecamatan: school.kecamatan,
    status: "SWASTA",
    schoolType: schoolType,
    jenjang: school.jenjang,
    dataStatus:
      (parseInt(school.student_count, 10) || 0) > 0
        ? "Aktif"
        : "Data Belum Lengkap",
    st_male: parseInt(school.st_male, 10) || 0,
    st_female: parseInt(school.st_female, 10) || 0,
    siswa: {
      jumlahSiswa: parseInt(school.student_count, 10) || 0,
      ...EMPTY_SISWA_DETAIL,
    },
    rombel: school.rombel,
    prasarana: {
      ukuran: { tanah: school.building_status?.tanah?.land_available },
      ruangKelas: {
        jumlah: school.class_condition?.total_room,
        baik: school.class_condition?.classrooms_good,
        rusakSedang: school.class_condition?.classrooms_moderate_damage,
        rusakBerat: school.class_condition?.classrooms_heavy_damage,
      },
      toiletGuruSiswa: { jumlah: school.toilets?.n_available },
    },
    guru: EMPTY_GURU_DETAIL,
    siswaAbk: {},
    kelembagaan: {},
  }));
};

const transformPkbmData = (schoolData, schoolType) => {
  const allSchools = Object.entries(schoolData).flatMap(
    ([kecamatanName, schoolsInKecamatan]) =>
      schoolsInKecamatan.map((school) => ({
        ...school,
        kecamatan: kecamatanName,
      }))
  );

  return allSchools.map((school) => ({
    id: school.npsn,
    namaSekolah: school.name,
    npsn: school.npsn,
    kecamatan: school.kecamatan,
    status: "SWASTA",
    schoolType: schoolType,
    jenjang: schoolType,
    dataStatus:
      (parseInt(school.student_count, 10) || 0) > 0
        ? "Aktif"
        : "Data Belum Lengkap",
    st_male: parseInt(school.st_male, 10) || 0,
    st_female: parseInt(school.st_female, 10) || 0,
    siswa: {
      jumlahSiswa: parseInt(school.student_count, 10) || 0,
      ...EMPTY_SISWA_DETAIL,
    },
    guru: EMPTY_GURU_DETAIL,
    prasarana: { ukuran: {}, ruangKelas: {}, mebeulair: {} },
    rombel: {},
    siswaAbk: {},
    kelembagaan: {},
  }));
};

const transformSmpData = (schoolData, schoolType) => {
  const allSchools = Object.entries(schoolData).flatMap(
    ([kecamatanName, schoolsInKecamatan]) =>
      schoolsInKecamatan.map((school) => ({
        ...school,
        kecamatan: kecamatanName,
      }))
  );

  return allSchools.map((school) => ({
    id: school.npsn,
    namaSekolah: school.name,
    npsn: school.npsn,
    kecamatan: school.kecamatan,
    status: school.type,
    schoolType: schoolType,
    jenjang: schoolType,
    dataStatus:
      (parseInt(school.student_count, 10) || 0) > 0
        ? "Aktif"
        : "Data Belum Lengkap",
    siswa: {
      jumlahSiswa: parseInt(school.student_count, 10) || 0,
      ...EMPTY_SISWA_DETAIL,
    },
    rombel: {},
    // map properti prasarana SMP
    class_condition: school.class_condition,
    library: school.library,
    laboratory_comp: school.laboratory_comp,
    laboratory_langua: school.laboratory_langua,
    laboratory_ipa: school.laboratory_ipa,
    laboratory_fisika: school.laboratory_fisika,
    laboratory_biologi: school.laboratory_biologi,
    kepsek_room: school.kepsek_room,
    teacher_room: school.teacher_room,
    administration_room: school.administration_room,
    teachers_toilet: school.teachers_toilet,
    students_toilet: school.students_toilet,
    furniture_computer: school.furniture_computer,
    guru: EMPTY_GURU_DETAIL,
    siswaAbk: {},
    kelembagaan: {},
  }));
};

export default function SchoolsTable({ operatorType }) {
  const [schoolsData, setSchoolsData] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchAndTransformData = async () => {
      if (!operatorType || !DATA_FILES[operatorType]) {
        setSchoolsData([]);
        setKecamatanList([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // 1) Coba Supabase dulu. Kalau sukses -> STOP, jangan fetch JSON.
        const { data: dbData, error: dbErr } = await supabase.rpc(
          "get_schools_full_report",
          {
            jenjang_filter: operatorType,
          }
        );

        if (!dbErr && Array.isArray(dbData) && dbData.length > 0) {
          setSchoolsData(dbData);
          const uniqueKecamatan = [
            ...new Set(dbData.map((s) => s.kecamatan).filter(Boolean)),
          ].sort();
          setKecamatanList(uniqueKecamatan);
          return;
        }

        // 2) Fallback JSON (kalau DB kosong/error)
        const dataUrl = DATA_FILES[operatorType];
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Gagal memuat ${dataUrl}`);
        const rawData = await response.json();

        let transformedSchools = [];

        switch (operatorType) {
          case "SD":
            transformedSchools = transformSdData(rawData, operatorType);
            break;
          case "SMP":
            transformedSchools = transformSmpData(rawData, operatorType);
            break;
          case "PAUD":
          case "TK":
            transformedSchools = transformPaudData(rawData, operatorType);
            break;
          case "PKBM":
            transformedSchools = transformPkbmData(rawData, operatorType);
            break;
          default:
            transformedSchools = [];
        }

        // filter PAUD/TK
        let finalFilteredSchools = transformedSchools;
        if (operatorType === "TK") {
          finalFilteredSchools = transformedSchools.filter(
            (school) => school.jenjang === "TK"
          );
        } else if (operatorType === "PAUD") {
          finalFilteredSchools = transformedSchools.filter(
            (school) => school.jenjang !== "TK"
          );
        }

        setSchoolsData(finalFilteredSchools);
        const uniqueKecamatan = [
          ...new Set(
            finalFilteredSchools.map((s) => s.kecamatan).filter(Boolean)
          ),
        ].sort();
        setKecamatanList(uniqueKecamatan);
      } catch (error) {
        console.error(
          `Error memuat atau memproses data untuk ${operatorType}:`,
          error
        );
        setSchoolsData([]);
        setKecamatanList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndTransformData();
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
          school.namaSekolah?.toLowerCase().includes(lower) ||
          String(school.npsn || "").includes(searchTerm)
      );
    }

    return filtered;
  }, [schoolsData, searchTerm, selectedKecamatan]);

  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSchools?.slice(startIndex, endIndex);
  }, [filteredSchools, currentPage, itemsPerPage]);

  const totalPages = Math.ceil((filteredSchools?.length || 0) / itemsPerPage);

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
    const seg = opType.toLowerCase();
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
          ) : paginatedSchools?.length === 0 ? (
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
                  {paginatedSchools?.map((school, index) => {
                    const jumlahSiswa =
                      Number(
                        school?.siswa?.jumlahSiswa ?? school?.student_count ?? 0
                      ) || 0;

                    return (
                      <TableRow
                        key={school.id || school.npsn}
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
                          {jumlahSiswa.toLocaleString("id-ID")}
                        </TableCell>

                        <TableCell className="pr-6">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={getDetailHref(operatorType, school.npsn)}
                            >
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-top border-border/60">
            <div className="text-sm text-muted-foreground">
              Menampilkan <strong>{paginatedSchools?.length}</strong> dari{" "}
              <strong>{filteredSchools?.length}</strong> data
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Baris per halaman:</span>
                <Select
                  value={`${itemsPerPage}`}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
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
