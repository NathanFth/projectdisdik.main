"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/lib/client";
import EditSchoolForm from "@/app/components/EditSchoolForm";
import { Loader2 } from "lucide-react";

/**
 * Mapper: hasil RPC -> initialData EditSchoolForm
 * Fokus: aman, tidak undefined, tidak rusak step lain
 */
function mapSchoolDetailToFormData(row) {
  const meta = row?.meta || {};

  return {
    id: row?.id || null, // ✅ ini UUID sekolah dari tabel schools
    school_id: row?.id || null, // ✅ optional biar fallback kamu juga kena

    jenjang: meta?.jenjang || "SMP",
    __metaRaw: meta,

    // NOTE: ini khusus untuk isi form, bukan untuk update PK
    namaSekolah: row?.name || "",
    npsn: row?.npsn || "",
    status: row?.status || meta?.status || "SWASTA",

    // ===== WILAYAH =====
    kecamatan_code: meta?.kecamatan_code || "",
    desa_code: meta?.desa_code || "",
    kecamatan: meta?.kecamatan || row?.kecamatan || "",
    desa: meta?.desa || row?.village || row?.village_name || "",

    // ===== ALAMAT & KOORDINAT =====
    alamat: row?.address || meta?.alamat || "",
    latitude: row?.lat != null ? String(row.lat) : "",
    longitude: row?.lng != null ? String(row.lng) : "",

    // ===== OPERATOR / KONTAK =====
    namaOperator:
      row?.contact?.operator_name || meta?.contact?.operator_name || "",
    hp: row?.contact?.operator_phone || meta?.contact?.operator_phone || "",

    // ===== STEP LANJUTAN (MINIMAL AMAN) =====
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

export default function SmpEditPage() {
  const params = useParams();

  // 🔒 amanin npsn (kadang array di Next)
  const npsn = useMemo(() => {
    const raw = params?.npsn;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!npsn) return;

    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setInitialData(null);
        setSchoolId(null);

        const { data, error } = await supabase.rpc(
          "get_school_detail_by_npsn",
          {
            input_npsn: String(npsn),
          }
        );

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error("Sekolah tidak ditemukan");

        // ✅ INI KUNCI: PK sekolah untuk update
        const idFromDb = row?.id ?? null;

        if (!idFromDb) {
          // Ini bukan error "UI", ini error "data source".
          // Tanpa id PK, update yang benar MUSTAHIL.
          throw new Error(
            "Data detail dari RPC tidak menyertakan 'id' (PK schools.id). Perbaiki RPC get_school_detail_by_npsn agar return field id."
          );
        }

        if (ignore) return;

        const mapped = mapSchoolDetailToFormData(row);

        setSchoolId(idFromDb);
        setInitialData(mapped);
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

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin w-4 h-4" />
        Memuat data sekolah…
      </div>
    );
  }

  // ===== ERROR =====
  if (error) {
    return (
      <div className="p-4 border border-destructive/30 rounded-lg text-destructive text-sm">
        {error}
      </div>
    );
  }

  // ===== GUARD (harusnya tidak kejadian kalau sudah lolos error) =====
  if (!initialData || !schoolId) {
    return (
      <div className="p-4 border rounded-lg text-sm">
        Data belum siap (initialData / schoolId kosong).
      </div>
    );
  }

  // ===== READY =====
  return (
    <EditSchoolForm
      key={npsn}
      schoolType="SMP"
      initialData={initialData}
      schoolId={initialData?.id} // ✅ paksa lewat prop
    />
  );
}
