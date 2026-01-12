// src/app/dashboard/pkbm/edit/[npsn]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/lib/client";
import EditSchoolForm from "@/app/components/EditSchoolForm";
import { Loader2 } from "lucide-react";

/**
 * Mapper: Menghubungkan data asli Supabase (RPC) ke struktur Form PKBM
 * Kak Gem pastikan data Alamat, Wilayah, Koordinat, dan Prasarana terisi otomatis.
 */
function mapSchoolDetailToFormData(row) {
  if (!row) return null;
  const meta = row.meta || {};

  return {
    // ID Sekolah UUID wajib ada untuk proses Update
    id: row.id,

    // ===== STEP INFO =====
    namaSekolah: row.namaSekolah || row.name || "",
    npsn: row.npsn || "",
    status: row.status || meta.status || "SWASTA",

    // ===== WILAYAH & ALAMAT (FIX: Sinkron dengan hasil SQL RPC baru) =====
    // RPC mengirim 'alamat', Form mencari 'alamat'
    alamat: row.alamat || row.address || meta.alamat || "",
    // RPC mengirim 'desa', Form mencari 'desa'
    desa: row.desa || row.village || row.village_name || meta.desa || "",
    kecamatan: row.kecamatan || meta.kecamatan || "",

    // Code wilayah agar Dropdown langsung otomatis terpilih
    kecamatan_code: row.kecamatan_code || meta.kecamatan_code || "",
    desa_code: row.desa_code || meta.desa_code || "",

    // ===== KOORDINAT (FIX: Mapping dari lat/lng root ke latitude/longitude form) =====
    latitude: row.lat != null ? String(row.lat) : meta.latitude || "",
    longitude: row.lng != null ? String(row.lng) : meta.longitude || "",

    // ===== OPERATOR / KONTAK =====
    namaOperator: row.contact?.operator_name || meta.namaOperator || "",
    hp: row.contact?.operator_phone || meta.hp || "",

    // ===== DATA GURU (Sinkron dari staff_summary via RPC) =====
    guru: row.guru ||
      meta.guru || {
        pns: 0,
        pppk: 0,
        pppkParuhWaktu: 0,
        nonAsnDapodik: 0,
        nonAsnTidakDapodik: 0,
        kekuranganGuru: 0,
      },

    // ===== DATA SISWA (Sinkron dari school_classes via RPC) =====
    siswa: row.siswa || meta.siswa || {},
    rombel: row.rombel || meta.rombel || {},
    lanjut: row.lanjut || meta.lanjut || {},

    // ===== DATA PRASARANA (Mapping ulang agar pas dengan path di EditSchoolForm) =====
    prasarana: {
      ukuran: row.prasarana?.ukuran || meta.prasarana?.ukuran || {},
      classrooms: row.prasarana?.ruangKelas || meta.prasarana?.classrooms || {},
      rooms: {
        library:
          row.prasarana?.ruangPerpustakaan ||
          meta.prasarana?.rooms?.library ||
          {},
        laboratory:
          row.prasarana?.ruangLaboratorium ||
          meta.prasarana?.rooms?.laboratory ||
          {},
        teacher_room:
          row.prasarana?.ruangGuru || meta.prasarana?.rooms?.teacher_room || {},
        uks_room:
          row.prasarana?.ruangUks || meta.prasarana?.rooms?.uks_room || {},
        toilets:
          row.prasarana?.toiletGuruSiswa ||
          meta.prasarana?.rooms?.toilets ||
          {},
        official_residences:
          row.prasarana?.rumahDinas ||
          meta.prasarana?.rooms?.official_residences ||
          {},
      },
      furniture: {
        tables:
          row.prasarana?.mebeulair?.tables ||
          meta.prasarana?.furniture?.tables ||
          {},
        chairs:
          row.prasarana?.mebeulair?.chairs ||
          meta.prasarana?.furniture?.chairs ||
          {},
        computer:
          row.prasarana?.mebeulair?.computer ||
          meta.prasarana?.furniture?.computer ||
          0,
      },
      chromebook: row.prasarana?.chromebook || meta.prasarana?.chromebook || 0,
    },

    // ===== DATA LAINNYA =====
    kegiatanFisik: row.kegiatanFisik || meta.kegiatanFisik || {},
    kelembagaan: row.kelembagaan || meta.kelembagaan || {},
    siswaAbk: row.siswaAbk || meta.siswaAbk || {},

    jenjang: row.jenjang || meta.jenjang || "PKBM",
    __metaRaw: meta,
    meta: meta, // Digunakan sebagai fallback
  };
}

export default function PkbmEditPage() {
  const params = useParams();

  const npsn = useMemo(() => {
    const raw = params?.npsn;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!npsn) return;

    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        // Panggil RPC detail sekolah yang sudah kita optimasi
        const { data, error: rpcError } = await supabase.rpc(
          "get_school_detail_by_npsn",
          { input_npsn: npsn }
        );

        console.log("Data RPC (PKBM Edit):", data);

        if (rpcError) throw rpcError;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error("Data PKBM tidak ditemukan.");

        if (ignore) return;

        // Transformasi data database ke format form yang benar
        const mappedData = mapSchoolDetailToFormData(row);
        setInitialData(mappedData);
      } catch (err) {
        console.error("Load Error PKBM Edit:", err);
        if (!ignore) setError(err?.message || "Gagal memuat data sekolah.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [npsn]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
        <p className="text-sm font-medium">Menyiapkan data PKBM...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600 m-8 text-center">
        <h3 className="font-bold mb-1">Gagal Memuat Data</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <EditSchoolForm key={npsn} schoolType="PKBM" initialData={initialData} />
  );
}
