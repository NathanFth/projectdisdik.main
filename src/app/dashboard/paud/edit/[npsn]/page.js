// src/app/dashboard/paud/edit/[npsn]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/lib/client";
import EditSchoolForm from "@/app/components/EditSchoolForm";
import { Loader2 } from "lucide-react";

/**
 * Mapper: Menghubungkan data asli Supabase (RPC) ke struktur Form PAUD
 * Kak Gem pastikan data Alamat, Wilayah, Koordinat, dan Prasarana terisi otomatis.
 */
function mapSchoolDetailToFormData(row) {
  if (!row) return null;
  const meta = row.meta || {};

  return {
    // ID Sekolah UUID wajib ada agar handleSave bisa melakukan Update
    id: row.id,

    // ===== STEP INFO =====
    namaSekolah: row.namaSekolah || "",
    npsn: row.npsn || "",
    status: row.status || meta.status || "SWASTA",

    // ===== WILAYAH & ALAMAT (FIX: Sinkron dengan hasil SQL RPC baru) =====
    // RPC mengirim 'alamat', Form mencari 'alamat'
    alamat: row.alamat || row.address || meta.alamat || "",
    // RPC mengirim 'desa', Form mencari 'desa'
    desa: row.desa || row.village || meta.desa || "",
    kecamatan: row.kecamatan || meta.kecamatan || "",

    // Code wilayah agar Dropdown langsung otomatis terpilih
    kecamatan_code: row.kecamatan_code || meta.kecamatan_code || "",
    desa_code: row.desa_code || meta.desa_code || "",

    // ===== KOORDINAT (FIX: Mapping dari lat/lng ke latitude/longitude) =====
    latitude: row.lat != null ? String(row.lat) : meta.latitude || "",
    longitude: row.lng != null ? String(row.lng) : meta.longitude || "",

    // ===== OPERATOR / KONTAK =====
    namaOperator: row.contact?.operator_name || meta.namaOperator || "",
    hp: row.contact?.operator_phone || meta.hp || "",

    // ===== DATA GURU (Sinkron dari tabel staff_summary via RPC) =====
    guru: row.guru ||
      meta.guru || {
        pns: 0,
        pppk: 0,
        pppkParuhWaktu: 0,
        nonAsnDapodik: 0,
        nonAsnTidakDapodik: 0,
        kekuranganGuru: 0,
      },

    // ===== DATA SISWA (Sinkron dari tabel school_classes via RPC) =====
    siswa: row.siswa || meta.siswa || {},
    rombel: row.rombel || meta.rombel || {},
    lanjut: row.lanjut || meta.lanjut || {},

    // ===== DATA PRASARANA (Mapping ulang agar pas dengan EditSchoolForm) =====
    prasarana: {
      ukuran: row.prasarana?.ukuran || meta.prasarana?.ukuran || {},
      // RPC me-return 'ruangKelas', Form mencari path 'classrooms'
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

    // ===== LAINNYA =====
    kegiatanFisik: row.kegiatanFisik || meta.kegiatanFisik || {},
    kelembagaan: row.kelembagaan || meta.kelembagaan || {},
    siswaAbk: row.siswaAbk || meta.siswaAbk || {},

    jenjang: row.jenjang || meta.jenjang || "PAUD",
    __metaRaw: meta,
    meta: meta, // Tetap sertakan objek meta sebagai fallback
  };
}

export default function PaudEditPage() {
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

        // Panggil RPC detail sekolah yang sudah kita perbaiki
        const { data, error: rpcError } = await supabase.rpc(
          "get_school_detail_by_npsn",
          { input_npsn: npsn }
        );

        console.log("Data RPC (PAUD Edit):", data);

        if (rpcError) throw rpcError;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error("Sekolah tidak ditemukan.");

        if (ignore) return;

        // Sinkronisasi data ke Form
        const mappedData = mapSchoolDetailToFormData(row);
        setInitialData(mappedData);
      } catch (e) {
        console.error("Load Error PAUD Edit:", e);
        if (!ignore) setError(e?.message || "Gagal memuat data");
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
        <p className="text-sm font-medium">Menyiapkan data PAUD...</p>
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
    <EditSchoolForm key={npsn} schoolType="PAUD" initialData={initialData} />
  );
}
