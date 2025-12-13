"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Sidebar from "../../../components/Sidebar";
import { Button } from "../../../components/ui/button";
import SchoolDetailsTabs from "../../../components/SchoolDetailsTabs";
import { BookOpen, ArrowLeft, Loader2, PencilLine } from "lucide-react";
import { supabase } from "@/lib/supabase/lib/client";

const PAUD_DATA_URL = "/data/paud.json";
const OPERATOR_TYPE = "PAUD";

// Sama seperti di SchoolsTable.js
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

// transform 1 sekolah PAUD/TK -> bentuk yang dipakai SchoolDetailsTabs (fallback JSON)
function transformSinglePaudSchool(rawSchool, kecamatanName) {
  const school = {
    ...rawSchool,
    kecamatan: kecamatanName,
    jenjang: rawSchool.type, // "TK", "KB", "SPS", dll
  };

  const totalSiswa = parseInt(school.student_count, 10) || 0;

  return {
    id: school.npsn,
    namaSekolah: school.name,
    npsn: school.npsn,
    kecamatan: school.kecamatan,
    status: "SWASTA",
    schoolType: OPERATOR_TYPE, // "PAUD" -> supaya isPaud = true
    jenjang: school.jenjang,
    dataStatus: totalSiswa > 0 ? "Aktif" : "Data Belum Lengkap",

    st_male: parseInt(school.st_male, 10) || 0,
    st_female: parseInt(school.st_female, 10) || 0,

    siswa: {
      jumlahSiswa: totalSiswa,
      ...EMPTY_SISWA_DETAIL,
    },

    rombel: school.rombel || {},

    prasarana: {
      ukuran: {
        tanah: school.building_status?.tanah?.land_available,
      },
      ruangKelas: {
        jumlah: school.class_condition?.total_room,
        baik: school.class_condition?.classrooms_good,
        rusakSedang: school.class_condition?.classrooms_moderate_damage,
        rusakBerat: school.class_condition?.classrooms_heavy_damage,
      },
      toiletGuruSiswa: {
        jumlah: school.toilets?.n_available,
        baik: school.toilets?.good,
        rusakSedang: school.toilets?.moderate_damage,
        rusakBerat: school.toilets?.heavy_damage,
      },
    },

    guru: EMPTY_GURU_DETAIL,
    siswaAbk: {},
    kelembagaan: {},
  };
}

// Normalize dari Supabase RPC -> bentuk SchoolDetailsTabs
function normalizeDbPaudDetail(dbDataRaw) {
  if (!dbDataRaw) return null;

  // RPC kadang balikin array
  const dbData = Array.isArray(dbDataRaw) ? dbDataRaw[0] : dbDataRaw;
  if (!dbData) return null;

  // Kalau RPC sudah ngasih format siap pakai (namaSekolah, dll), kita pakai
  if (dbData.namaSekolah && dbData.npsn) {
    return {
      siswa: { jumlahSiswa: 0, ...EMPTY_SISWA_DETAIL, ...(dbData.siswa || {}) },
      guru: { ...EMPTY_GURU_DETAIL, ...(dbData.guru || {}) },
      siswaAbk: dbData.siswaAbk || {},
      kelembagaan: dbData.kelembagaan || {},
      prasarana: dbData.prasarana || {
        ukuran: {},
        ruangKelas: {},
        toiletGuruSiswa: {},
      },
      rombel: dbData.rombel || dbData.meta?.rombel || {},
      schoolType: dbData.schoolType || OPERATOR_TYPE,
      jenjang: dbData.jenjang || "PAUD",
      status: dbData.status || "SWASTA",
      dataStatus: dbData.dataStatus || "Aktif",
      st_male: Number(dbData.st_male || 0),
      st_female: Number(dbData.st_female || 0),
      id: dbData.id || dbData.npsn,
      ...dbData,
    };
  }

  // Kalau formatnya masih mentah (school table), kita mapping defensif
  const npsn = String(dbData.npsn || "");
  const namaSekolah = dbData.name || dbData.school_name || "";
  const totalSiswa = Number(dbData.student_count || 0) || 0;

  const kecamatan =
    dbData.meta?.kecamatan ||
    dbData.location?.subdistrict ||
    dbData.subdistrict ||
    dbData.kecamatan ||
    "";

  const desa =
    dbData.meta?.desa ||
    dbData.location?.village ||
    dbData.village_name ||
    dbData.desa ||
    "";

  // rombel kalau ada
  const rombel = dbData.meta?.rombel || dbData.rombel || {};

  return {
    id: npsn,
    namaSekolah,
    npsn,
    kecamatan,
    desa,
    status: dbData.status || "SWASTA",
    schoolType: OPERATOR_TYPE,
    jenjang: dbData.jenjang || dbData.meta?.jenjang || "PAUD",
    dataStatus: totalSiswa > 0 ? "Aktif" : "Data Belum Lengkap",

    st_male: Number(dbData.st_male || 0),
    st_female: Number(dbData.st_female || 0),

    siswa: {
      jumlahSiswa: totalSiswa,
      ...EMPTY_SISWA_DETAIL,
    },

    rombel,

    prasarana: dbData.prasarana || {
      ukuran: {},
      ruangKelas: {},
      toiletGuruSiswa: {},
    },

    guru: EMPTY_GURU_DETAIL,
    siswaAbk: {},
    kelembagaan: {},
  };
}

export default function PaudDetailPage() {
  const params = useParams();
  const npsnParam = Array.isArray(params?.npsn) ? params.npsn[0] : params?.npsn;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        if (!npsnParam) throw new Error("NPSN tidak valid");

        // ✅ 1) Supabase dulu
        const { data: dbData, error: dbErr } = await supabase.rpc(
          "get_school_detail_by_npsn",
          {
            input_npsn: String(npsnParam),
          }
        );

        if (!dbErr && dbData) {
          const normalized = normalizeDbPaudDetail(dbData);

          if (normalized) {
            // route /paud harus non-TK (sesuai logic lama)
            if (String(normalized.jenjang || "").toUpperCase() === "TK") {
              throw new Error("Data ini termasuk TK, bukan PAUD.");
            }

            if (!ignore) setDetail(normalized);
            return;
          }
        }

        // ✅ 2) Fallback JSON
        const res = await fetch(PAUD_DATA_URL);
        if (!res.ok) throw new Error("Gagal memuat data PAUD");

        const rawData = await res.json();

        const transformedSchools = Object.entries(rawData).flatMap(
          ([kecamatanName, schoolsInKecamatan]) =>
            schoolsInKecamatan.map((school) =>
              transformSinglePaudSchool(school, kecamatanName)
            )
        );

        const filteredSchools = transformedSchools.filter(
          (school) => school.jenjang !== "TK"
        );
        const found = filteredSchools.find(
          (school) => String(school.npsn) === String(npsnParam)
        );

        if (!found)
          throw new Error("Satuan PAUD dengan NPSN tersebut tidak ditemukan");

        if (!ignore) setDetail(found);
      } catch (e) {
        if (!ignore) {
          setError(e?.message || "Terjadi kesalahan saat memuat data");
          setDetail(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [npsnParam]);

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background md:pl-0">
        <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span>Detail PAUD</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Detail PAUD
              </h1>
              {npsnParam && (
                <p className="text-sm text-muted-foreground">
                  NPSN: <span className="font-mono">{npsnParam}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>

              <Link href="/dashboard/paud">
                <Button variant="outline" size="sm">
                  Ke Data PAUD
                </Button>
              </Link>

              {npsnParam && (
                <Link href={`/dashboard/paud/edit/${npsnParam}`}>
                  <Button size="sm">
                    <PencilLine className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Konten */}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat detail…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <SchoolDetailsTabs school={detail} />
          )}
        </main>
      </div>
    </>
  );
}
