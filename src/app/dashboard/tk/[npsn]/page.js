"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import SchoolDetailsTabs from "@/app/components/SchoolDetailsTabs";
import { supabase } from "@/lib/supabase/lib/client";

const PAUD_DATA_URL = "/data/paud.json";

// Kita pakai "PAUD" supaya UI detail tetap masuk mode PAUD/TK (isPaud = true)
const OPERATOR_TYPE = "PAUD";

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

function transformSingleTkSchool(rawSchool, kecamatanName) {
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
    schoolType: OPERATOR_TYPE, // biar masuk mode PAUD/TK di tabs
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

export default function TkDetailPage() {
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

        // 1) Coba DB dulu (kalau TK sudah masuk Supabase)
        try {
          const { data, error } = await supabase.rpc(
            "get_school_detail_by_npsn",
            {
              input_npsn: npsnParam,
            }
          );

          if (!error && data) {
            if (!ignore) setDetail(data);
            return;
          }
        } catch (_) {
          // fallback JSON
        }

        // 2) Fallback JSON statis
        const res = await fetch(PAUD_DATA_URL);
        if (!res.ok) throw new Error("Gagal memuat data TK");

        const rawData = await res.json();

        const transformed = Object.entries(rawData).flatMap(
          ([kecamatanName, schoolsInKecamatan]) =>
            schoolsInKecamatan.map((s) =>
              transformSingleTkSchool(s, kecamatanName)
            )
        );

        // TK detail: ambil jenjang === "TK"
        const onlyTk = transformed.filter((s) => s.jenjang === "TK");

        const found = onlyTk.find((s) => String(s.npsn) === String(npsnParam));
        if (!found)
          throw new Error("Satuan TK dengan NPSN tersebut tidak ditemukan");

        if (!ignore) setDetail(found);
      } catch (e) {
        if (!ignore) {
          setError(e.message || "Terjadi kesalahan saat memuat data");
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
    <div className="space-y-4">
      {/* Header */}
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

          <Link href="/dashboard/tk">
            <Button variant="outline" size="sm">
              Ke Data TK
            </Button>
          </Link>
        </div>
      </div>

      {/* Konten */}
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat detail...
        </div>
      )}

      {!loading && error && (
        <div className="p-4 border border-destructive/30 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {!loading && !error && detail && <SchoolDetailsTabs school={detail} />}
    </div>
  );
}
