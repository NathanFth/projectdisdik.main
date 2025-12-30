"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/lib/client";
import EditSchoolForm from "@/app/components/EditSchoolForm";
import { Loader2 } from "lucide-react";

function mapSchoolDetailToFormData(row) {
  const meta = row?.meta || {};

  return {
    // ✅ FIX: Masukkan ID Sekolah secara eksplisit
    id: row?.id || row?.school_id || row?.schoolId,

    __metaRaw: meta,

    namaSekolah: row?.name || "",
    npsn: row?.npsn || "",
    status: row?.status || meta?.status || "SWASTA",

    kecamatan_code: meta?.kecamatan_code || "",
    desa_code: meta?.desa_code || "",
    kecamatan: meta?.kecamatan || row?.kecamatan || "",
    desa: meta?.desa || row?.village || "",

    alamat: row?.address || meta?.alamat || "",
    latitude: row?.lat != null ? String(row.lat) : "",
    longitude: row?.lng != null ? String(row.lng) : "",

    namaOperator:
      row?.contact?.operator_name || meta?.contact?.operator_name || "",
    hp: row?.contact?.operator_phone || meta?.contact?.operator_phone || "",

    guru: meta?.guru || {
      pns: 0,
      pppk: 0,
      pppkParuhWaktu: 0,
      nonAsnDapodik: 0,
      nonAsnTidakDapodik: 0,
      kekuranganGuru: 0,
    },

    siswa: meta?.siswa || {},
    rombel: meta?.rombel || {},
    lanjut: meta?.lanjut || {},
    prasarana: meta?.prasarana || {},
    kegiatanFisik: meta?.kegiatanFisik || {},
    kelembagaan: meta?.kelembagaan || {},
  };
}

export default function TkEditPage() {
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

        const { data, error } = await supabase.rpc(
          "get_school_detail_by_npsn",
          {
            input_npsn: npsn,
          }
        );

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error("Sekolah tidak ditemukan");

        if (ignore) return;

        setInitialData(mapSchoolDetailToFormData(row));
      } catch (e) {
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
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin w-4 h-4" />
        Memuat data sekolah…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/30 rounded-lg text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <EditSchoolForm key={npsn} schoolType="TK" initialData={initialData} />
  );
}
