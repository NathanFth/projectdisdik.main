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

const OPERATOR_TYPE = "PAUD";

const makeEmptySiswaDetail = () => ({
  tka: { l: 0, p: 0 },
  tkb: { l: 0, p: 0 },
  kb: { l: 0, p: 0 },
  sps_tpa: { l: 0, p: 0 },
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

function buildPaudSiswaFromClasses(rows) {
  const siswa = makeEmptySiswaDetail();
  const list = Array.isArray(rows) ? rows : [];

  for (const r of list) {
    const gradeRaw = String(r?.grade || "").trim();
    const count = Number(r?.count || 0);

    if (!gradeRaw || !Number.isFinite(count) || count === 0) continue;

    // ✅ FIX UTAMA: Ganti underscore (_) jadi spasi
    // "kb_L" -> "kb l", "tka_P" -> "tka p"
    // Ini membuat Regex \b (batas kata) bisa mendeteksi "kb" atau "tka" dengan benar.
    const g = gradeRaw.replace(/_/g, " ").toLowerCase();

    // Deteksi gender
    const isFemale = /perempuan|wanita|\bP\b| p\b/i.test(g);
    const gender = isFemale ? "p" : "l";

    // --- LOGIC PENCOCOKAN ---

    // tka
    if (/\btka\b/.test(g) || /tk a/.test(g) || /kelompok a/.test(g)) {
      siswa.tka[gender] += count;
      continue;
    }

    // tkb
    if (/\btkb\b/.test(g) || /tk b/.test(g) || /kelompok b/.test(g)) {
      siswa.tkb[gender] += count;
      continue;
    }

    // kb (Kelompok Bermain)
    if (/\bkb\b/.test(g) || /bermain/.test(g) || /kelompok bermain/.test(g)) {
      siswa.kb[gender] += count;
      continue;
    }

    // sps_tpa
    if (/\bsps\b/.test(g) || /\btpa\b/.test(g) || /sps\/tpa/.test(g)) {
      siswa.sps_tpa[gender] += count;
      continue;
    }

    // Fallback legacy (jika ada data lama format kelas1/kelas2)
    if (g.includes("kelas1") || /\b1\b/.test(g)) {
      siswa.tka[gender] += count;
      continue;
    }
    if (g.includes("kelas2") || /\b2\b/.test(g)) {
      siswa.tkb[gender] += count;
      continue;
    }
  }

  return siswa;
}

function normalizeDbPaudDetail(dbDataRaw, parsedSiswaClasses) {
  if (!dbDataRaw) return null;
  const dbData = Array.isArray(dbDataRaw) ? dbDataRaw[0] : dbDataRaw;
  if (!dbData) return null;

  // ✅ FIX: Ambil jenjang asli, jangan paksa jadi PAUD kalau aslinya TK
  // Ini penting agar SchoolDetailsTabs menampilkan kolom yang benar
  const realJenjang =
    dbData.meta?.jenjang || dbData.jenjang || dbData.schoolType || "PAUD";

  const totalSiswaHeader =
    Number(dbData.student_count || dbData?.siswa?.jumlahSiswa || 0) || 0;

  const stMale = Number(dbData.st_male || 0) || 0;
  const stFemale = Number(dbData.st_female || 0) || 0;

  let siswaDetail = parsedSiswaClasses || makeEmptySiswaDetail();

  const totalParsed =
    (siswaDetail.tka?.l || 0) +
    (siswaDetail.tka?.p || 0) +
    (siswaDetail.tkb?.l || 0) +
    (siswaDetail.tkb?.p || 0) +
    (siswaDetail.kb?.l || 0) +
    (siswaDetail.kb?.p || 0) +
    (siswaDetail.sps_tpa?.l || 0) +
    (siswaDetail.sps_tpa?.p || 0);

  if (totalParsed === 0 && totalSiswaHeader > 0) {
    const reset = makeEmptySiswaDetail();
    reset.tka.l = stMale;
    reset.tka.p = stFemale;
    siswaDetail = reset;
  }

  const rombel = dbData?.meta?.rombel ||
    dbData?.rombel || {
      tka: 0,
      tkb: 0,
      kb: 0,
      sps_tpa: 0,
    };

  return {
    ...dbData,
    id: dbData.id || dbData.school_id || null,
    namaSekolah:
      dbData.namaSekolah || dbData.name || dbData.school_name || "Tanpa Nama",
    npsn: String(dbData.npsn || ""),
    status: dbData.status || "SWASTA",
    schoolType: realJenjang, // Gunakan jenjang asli
    jenjang: realJenjang,
    dataStatus: totalSiswaHeader > 0 ? "Aktif" : "Data Belum Lengkap",
    siswa: {
      jumlahSiswa: totalSiswaHeader,
      ...siswaDetail,
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
      toiletGuruSiswa: {},
    },
  };
}

export default function PaudDetailPage() {
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

      const { data: schoolBasic, error: schoolErr } = await supabase
        .from("schools")
        .select("*")
        .eq("npsn", String(npsnParam))
        .maybeSingle();

      if (schoolErr)
        throw new Error(schoolErr.message || "Gagal memuat sekolah");
      if (!schoolBasic) throw new Error("Sekolah tidak ditemukan");

      let parsedSiswa = makeEmptySiswaDetail();

      if (schoolBasic.id) {
        const { data: classRows, error: classErr } = await supabase
          .from("school_classes")
          .select("grade, count, school_id")
          .eq("school_id", schoolBasic.id);

        if (!classErr && classRows) {
          parsedSiswa = buildPaudSiswaFromClasses(classRows);
        }
      }

      const normalized = normalizeDbPaudDetail(schoolBasic, parsedSiswa);
      setDetail(normalized);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [npsnParam]);

  useEffect(() => {
    if (npsnParam) loadDetail();
  }, [loadDetail, npsnParam]);

  // ✅ LOGIC SMART EDIT LINK
  // Arahkan ke TK jika data aslinya TK
  const getEditLink = () => {
    if (!npsnParam || !detail) return "#";
    const j = String(detail.jenjang || "").toUpperCase();
    const basePath = j === "TK" ? "tk" : "paud";
    return `/dashboard/${basePath}/edit/${npsnParam}`;
  };

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background md:pl-0">
        <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span>Detail PAUD / TK</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {detail?.namaSekolah || "Detail Sekolah"}
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
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={loadDetail}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />{" "}
                Coba lagi
              </Button>

              <Link href="/dashboard/paud">
                <Button variant="outline" size="sm">
                  Ke Data PAUD
                </Button>
              </Link>

              {npsnParam && detail && (
                <Link href={getEditLink()}>
                  <Button size="sm">
                    <PencilLine className="h-4 w-4 mr-2" /> Edit Data
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat detail…
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
