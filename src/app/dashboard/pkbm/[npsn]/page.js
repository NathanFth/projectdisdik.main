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

const OPERATOR_TYPE = "PKBM";

const makeEmptyPkbmSiswa = () => ({
  paketA: {
    kelas1: { l: 0, p: 0 },
    kelas2: { l: 0, p: 0 },
    kelas3: { l: 0, p: 0 },
    kelas4: { l: 0, p: 0 },
    kelas5: { l: 0, p: 0 },
    kelas6: { l: 0, p: 0 },
  },
  paketB: {
    kelas7: { l: 0, p: 0 },
    kelas8: { l: 0, p: 0 },
    kelas9: { l: 0, p: 0 },
  },
  paketC: {
    kelas10: { l: 0, p: 0 },
    kelas11: { l: 0, p: 0 },
    kelas12: { l: 0, p: 0 },
  },
});

const EMPTY_GURU_DETAIL = {
  jumlahGuru: 0,
  pns: 0,
  pppk: 0,
  pppkParuhWaktu: 0,
  nonAsnDapodik: 0,
  nonAsnTidakDapodik: 0,
  kekuranganGuru: 0,
};

// --- LOGIKA PARSING SISWA (YANG SUDAH DIPERBAIKI) ---
function buildPkbmSiswaFromSchoolClasses(rows) {
  const siswa = makeEmptyPkbmSiswa();
  const list = Array.isArray(rows) ? rows : [];

  for (const r of list) {
    const gradeRaw = String(r?.grade || "").trim();
    const count = Number(r?.count || 0) || 0;
    if (!gradeRaw || count <= 0) continue;

    // 1) PRIORITAS: format canonical: paketA_kelas1_L
    const m = gradeRaw.match(/^paket([ABC])_kelas(\d+)_([LP])$/i);
    if (m) {
      const paketKey = `paket${String(m[1]).toUpperCase()}`; // paketA/B/C
      const kelasKey = `kelas${m[2]}`;
      const genderKey = String(m[3]).toUpperCase() === "P" ? "p" : "l";

      if (!siswa[paketKey]) siswa[paketKey] = {};
      if (!siswa[paketKey][kelasKey])
        siswa[paketKey][kelasKey] = { l: 0, p: 0 };
      siswa[paketKey][kelasKey][genderKey] += count;
      continue;
    }

    // 2) FALLBACK: parse longgar (kalau format berubah)
    const matchNumber = gradeRaw.match(/(\d+)/);
    if (!matchNumber) continue;

    const num = parseInt(matchNumber[1], 10);
    if (!Number.isFinite(num)) continue;

    let paketKey = null;
    if (num >= 1 && num <= 6) paketKey = "paketA";
    else if (num >= 7 && num <= 9) paketKey = "paketB";
    else if (num >= 10 && num <= 12) paketKey = "paketC";
    if (!paketKey) continue;

    const kelasKey = `kelas${num}`;
    if (!siswa[paketKey][kelasKey]) continue;

    // gender: utamakan _L/_P dulu, baru kata-kata
    const hasP = /_P\b/i.test(gradeRaw);
    const hasL = /_L\b/i.test(gradeRaw);
    let genderKey = "l";
    if (hasP) genderKey = "p";
    else if (hasL) genderKey = "l";
    else if (/perempuan|wanita/i.test(gradeRaw)) genderKey = "p";

    siswa[paketKey][kelasKey][genderKey] += count;
  }

  return siswa;
}

function normalizeDbPkbmDetail(dbDataRaw, pkbmSiswaFromClasses) {
  if (!dbDataRaw) return null;
  const dbData = Array.isArray(dbDataRaw) ? dbDataRaw[0] : dbDataRaw;
  if (!dbData) return null;

  const totalSiswa =
    Number(dbData.student_count || dbData?.siswa?.jumlahSiswa || 0) || 0;

  const rombel = dbData.rombel || dbData.meta?.rombel || {};
  const structureSiswa = pkbmSiswaFromClasses || makeEmptyPkbmSiswa();

  return {
    ...dbData,
    id: dbData.id || dbData.school_id || null, // Pastikan ID terambil

    namaSekolah:
      dbData.namaSekolah || dbData.name || dbData.school_name || "Tanpa Nama",
    npsn: String(dbData.npsn || ""),

    status: dbData.status || "SWASTA",
    schoolType: OPERATOR_TYPE,
    jenjang: dbData.jenjang || dbData.meta?.jenjang || "PKBM",
    dataStatus: totalSiswa > 0 ? "Aktif" : "Data Belum Lengkap",

    // Gunakan hasil parsing siswa
    siswa: {
      jumlahSiswa: totalSiswa,
      paketA: structureSiswa.paketA,
      paketB: structureSiswa.paketB,
      paketC: structureSiswa.paketC,
    },

    rombel,
    guru: {
      ...EMPTY_GURU_DETAIL,
      ...(dbData.guru || dbData.meta?.guru || {}),
    },
    siswaAbk: dbData.siswaAbk || {},
    kelembagaan: dbData.kelembagaan || {},
    prasarana: dbData.prasarana || {
      ukuran: {},
      ruangKelas: {},
      mebeulair: {},
    },
  };
}

export default function PkbmDetailPage() {
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

      // 1. Ambil Data Sekolah Dasar
      // Menggunakan maybeSingle untuk mencegah error jika 0 row
      const { data: schoolBasic, error: schoolErr } = await supabase
        .from("schools")
        .select("*")
        .eq("npsn", String(npsnParam))
        .maybeSingle();

      if (schoolErr)
        throw new Error(schoolErr.message || "Gagal memuat data sekolah");

      if (!schoolBasic)
        throw new Error("Data sekolah tidak ditemukan (NPSN salah?)");

      // 2. Ambil Data Kelas (School Classes) berdasarkan ID sekolah
      let pkbmSiswa = makeEmptyPkbmSiswa();

      if (schoolBasic.id) {
        const { data: classRows, error: classErr } = await supabase
          .from("school_classes")
          .select("grade, count, school_id")
          .eq("school_id", schoolBasic.id);

        if (!classErr && classRows) {
          pkbmSiswa = buildPkbmSiswaFromSchoolClasses(classRows);
        }
      }

      // 3. Gabungkan dan Normalisasi
      const normalized = normalizeDbPkbmDetail(schoolBasic, pkbmSiswa);
      if (!normalized) throw new Error("Gagal memproses data sekolah");

      setDetail(normalized);
    } catch (e) {
      console.error(e);
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
                <span>Detail PKBM</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Detail PKBM
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

              <Link href="/dashboard/pkbm">
                <Button variant="outline" size="sm">
                  Ke Data PKBM
                </Button>
              </Link>

              {npsnParam && (
                <Link href={`/dashboard/pkbm/edit/${npsnParam}`}>
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
            <div className="p-4 border border-destructive/30 rounded-lg text-destructive text-sm bg-destructive/5">
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
