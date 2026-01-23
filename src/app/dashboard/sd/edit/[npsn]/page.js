// src/app/dashboard/sd/edit/[npsn]/page.js

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/lib/client";
import EditSchoolForm from "@/app/components/EditSchoolForm";
import { Loader2 } from "lucide-react";

function formatSupabaseError(err) {
  if (!err) return "Terjadi kesalahan (error kosong).";
  if (typeof err === "string") return err;

  const msg =
    err.message ||
    err.error_description ||
    err.msg ||
    err.error ||
    "Terjadi kesalahan (tanpa message).";

  const parts = [msg];
  if (err.code) parts.push(`code=${err.code}`);
  if (err.details) parts.push(`details=${err.details}`);
  if (err.hint) parts.push(`hint=${err.hint}`);

  if (parts.length === 1) {
    try {
      parts.push(`raw=${JSON.stringify(err)}`);
    } catch {}
  }

  return parts.join(" | ");
}

function mapSchoolDetailToFormData(row) {
  if (!row) return null;
  const meta = row.meta || {};

  return {
    id: row.id,

    namaSekolah: row.namaSekolah || row.name || "",
    npsn: row.npsn || "",
    status: row.status || meta.status || "SWASTA",

    alamat: row.alamat || row.address || meta.alamat || "",
    desa: row.desa || row.village || row.village_name || meta.desa || "",
    kecamatan: row.kecamatan || meta.kecamatan || "",

    kecamatan_code: row.kecamatan_code || meta.kecamatan_code || "",
    desa_code: row.desa_code || meta.desa_code || "",

    latitude: row.lat != null ? String(row.lat) : meta.latitude || "",
    longitude: row.lng != null ? String(row.lng) : meta.longitude || "",

    namaOperator:
      row.contact?.operator_name ||
      meta.contact?.operator_name ||
      meta.namaOperator ||
      "",
    hp:
      row.contact?.operator_phone ||
      meta.contact?.operator_phone ||
      meta.hp ||
      "",

    guru: row.guru ||
      meta.guru || {
        pns: 0,
        pppk: 0,
        pppkParuhWaktu: 0,
        nonAsnDapodik: 0,
        nonAsnTidakDapodik: 0,
        kekuranganGuru: 0,
      },

    siswa: row.siswa || meta.siswa || {},
    rombel: row.rombel || meta.rombel || {},
    lanjut: row.lanjut || meta.lanjut || {},

    prasarana: {
      ukuran: row.prasarana?.ukuran || meta.prasarana?.ukuran || {},

      classrooms:
        row.prasarana?.classrooms ||
        row.prasarana?.ruangKelas ||
        meta.prasarana?.classrooms ||
        {},

      rooms: {
        library:
          row.prasarana?.rooms?.library ||
          row.prasarana?.ruangPerpustakaan ||
          meta.prasarana?.rooms?.library ||
          {},
        laboratory:
          row.prasarana?.rooms?.laboratory ||
          row.prasarana?.ruangLaboratorium ||
          meta.prasarana?.rooms?.laboratory ||
          {},
        teacher_room:
          row.prasarana?.rooms?.teacher_room ||
          row.prasarana?.ruangGuru ||
          meta.prasarana?.rooms?.teacher_room ||
          {},
        headmaster_room:
          row.prasarana?.rooms?.headmaster_room ||
          row.prasarana?.ruangKepsek ||
          meta.prasarana?.rooms?.headmaster_room ||
          {},
        administration_room:
          row.prasarana?.rooms?.administration_room ||
          row.prasarana?.administration_room ||
          meta.prasarana?.rooms?.administration_room ||
          {},
        uks_room:
          row.prasarana?.rooms?.uks_room ||
          row.prasarana?.ruangUks ||
          meta.prasarana?.rooms?.uks_room ||
          {},
        toilets:
          row.prasarana?.rooms?.toilets ||
          row.prasarana?.toiletGuruSiswa ||
          meta.prasarana?.rooms?.toilets ||
          {},
        official_residences:
          row.prasarana?.rooms?.official_residences ||
          row.prasarana?.rumahDinas ||
          meta.prasarana?.rooms?.official_residences ||
          {},
      },

      furniture: {
        tables:
          row.prasarana?.mebeulair?.tables ||
          row.prasarana?.furniture?.tables ||
          meta.prasarana?.furniture?.tables ||
          {},
        chairs:
          row.prasarana?.mebeulair?.chairs ||
          row.prasarana?.furniture?.chairs ||
          meta.prasarana?.furniture?.chairs ||
          {},
        whiteboard:
          row.prasarana?.mebeulair?.whiteboard ||
          row.prasarana?.furniture?.whiteboard ||
          meta.prasarana?.furniture?.whiteboard ||
          {},
        computer:
          row.prasarana?.mebeulair?.computer ||
          row.prasarana?.furniture?.computer ||
          meta.prasarana?.furniture?.computer ||
          0,
      },

      chromebook: row.prasarana?.chromebook || meta.prasarana?.chromebook || 0,
      peralatanRumahTangga:
        row.prasarana?.peralatanRumahTangga ||
        meta.prasarana?.peralatanRumahTangga ||
        "Baik",
    },

    kegiatanFisik: row.kegiatanFisik || meta.kegiatanFisik || {},
    kelembagaan: row.kelembagaan || meta.kelembagaan || {},
    siswaAbk: row.siswaAbk || meta.siswaAbk || {},

    jenjang: row.jenjang || meta.jenjang || "SD",
    __metaRaw: meta,
    meta: meta,
  };
}

export default function SdEditPage() {
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

        const { data, error: rpcError } = await supabase.rpc(
          "get_school_by_npsn",
          { input_npsn: String(npsn) },
        );

        if (rpcError) {
          console.error("RPC Error get_school_by_npsn (SD):", rpcError);
          throw new Error(formatSupabaseError(rpcError));
        }

        const row = Array.isArray(data) ? data[0] : data;

        if (!row || Object.keys(row).length === 0) {
          throw new Error("Sekolah tidak ditemukan.");
        }

        if (ignore) return;

        setInitialData(mapSchoolDetailToFormData(row));
      } catch (e) {
        console.error("Load Error SD Edit:", e);
        if (!ignore) setError(formatSupabaseError(e));
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
        <p className="text-sm font-medium">Menyiapkan data SD...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600 m-4 text-center">
        <h3 className="font-bold mb-1">Terjadi Kesalahan</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <EditSchoolForm
      key={String(npsn)}
      schoolType="SD"
      initialData={initialData}
    />
  );
}
