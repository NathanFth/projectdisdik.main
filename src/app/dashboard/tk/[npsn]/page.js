"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Sidebar from "../../../components/Sidebar";
import { Button } from "../../../components/ui/button";
import SchoolDetailsTabs from "../../../components/SchoolDetailsTabs";
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase/lib/client";

const OPERATOR_TYPE = "TK";

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

function normalizeDbTkDetail(dbDataRaw) {
  if (!dbDataRaw) return null;

  const dbData = Array.isArray(dbDataRaw) ? dbDataRaw[0] : dbDataRaw;
  if (!dbData) return null;

  // kalau sudah format siap pakai
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
      jenjang: dbData.jenjang || "TK",
      status: dbData.status || "SWASTA",
      dataStatus: dbData.dataStatus || "Aktif",
      st_male: Number(dbData.st_male || 0),
      st_female: Number(dbData.st_female || 0),
      id: dbData.id || dbData.npsn,
      ...dbData,
    };
  }

  // defensif kalau mentah
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

  const rombel = dbData.meta?.rombel || dbData.rombel || {};

  // ✅ PENTING: keep raw fields (meta, staff_summary, dll) supaya Tabs bisa normalize guru
  return {
    ...dbData,
    id: npsn,
    namaSekolah,
    npsn,
    kecamatan,
    desa,
    status: dbData.status || "SWASTA",
    schoolType: OPERATOR_TYPE,
    jenjang: dbData.jenjang || dbData.meta?.jenjang || "TK",
    dataStatus: totalSiswa > 0 ? "Aktif" : "Data Belum Lengkap",
    st_male: Number(dbData.st_male || 0),
    st_female: Number(dbData.st_female || 0),
    siswa: {
      jumlahSiswa: totalSiswa,
      ...EMPTY_SISWA_DETAIL,
      ...(dbData.siswa || {}),
    },
    rombel,
    prasarana: dbData.prasarana || {
      ukuran: {},
      ruangKelas: {},
      toiletGuruSiswa: {},
    },
    guru: { ...EMPTY_GURU_DETAIL, ...(dbData.guru || {}) },
    siswaAbk: dbData.siswaAbk || {},
    kelembagaan: dbData.kelembagaan || {},
  };
}

export default function TkDetailPage() {
  const params = useParams();
  const npsnParam = Array.isArray(params?.npsn) ? params.npsn[0] : params?.npsn;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setDetail(null);

      if (!npsnParam) throw new Error("NPSN tidak valid");

      const { data: dbData, error: dbErr } = await supabase.rpc(
        "get_school_detail_by_npsn",
        { input_npsn: String(npsnParam) }
      );

      if (dbErr)
        throw new Error(dbErr.message || "Gagal memuat detail dari database");

      const normalized = normalizeDbTkDetail(dbData);
      if (!normalized) throw new Error("Data TK tidak ditemukan di database");

      // TK route harus TK
      if (String(normalized.jenjang || "").toUpperCase() !== "TK") {
        throw new Error(
          "Data ini bukan TK. Coba buka di menu PAUD jika jenjangnya PAUD."
        );
      }

      setDetail(normalized);
    } catch (e) {
      setError(e?.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, [npsnParam]);

  useEffect(() => {
    let ignore = false;

    (async () => {
      if (ignore) return;
      await loadDetail();
    })();

    return () => {
      ignore = true;
    };
  }, [loadDetail]);

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background md:pl-0">
        <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span>Detail TK</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Detail TK
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

              <Button
                variant="outline"
                size="sm"
                onClick={loadDetail}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Coba lagi
              </Button>

              <Link href="/dashboard/tk">
                <Button variant="outline" size="sm">
                  Ke Data TK
                </Button>
              </Link>

              {npsnParam && (
                <Link href={`/dashboard/tk/edit/${npsnParam}`}>
                  <Button size="sm">
                    <PencilLine className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>

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
