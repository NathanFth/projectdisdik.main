"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button"; // Sesuaikan path ini jika perlu, misal: "../../../components/ui/button"
import SchoolDetailsTabs from "@/app/components/SchoolDetailsTabs"; // Sesuaikan path ini
import { ArrowLeft, Loader2, PencilLine, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/lib/client";
import { transformSchoolData } from "@/lib/utils/school-data-transformer";

export default function PaudDetailPage() {
  const params = useParams();
  const npsnParam = Array.isArray(params?.npsn) ? params.npsn[0] : params?.npsn;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  // Fungsi load data dipisah agar bisa dipanggil ulang (tombol refresh)
  const loadDetail = useCallback(async () => {
    if (!npsnParam) return;

    try {
      setLoading(true);
      setError("");

      // 1. Fetch Data Sekolah Utama
      const { data: schoolRaw, error: schoolErr } = await supabase
        .from("schools")
        .select("*")
        .eq("npsn", String(npsnParam))
        .maybeSingle();

      if (schoolErr) throw schoolErr;
      if (!schoolRaw) throw new Error("Data sekolah tidak ditemukan.");

      // 2. Fetch Data Kelas (WAJIB ADA UNTUK HITUNG SISWA)
      // Kita ambil grade dan count untuk dihitung manual oleh Transformer V11
      const { data: classRows, error: classErr } = await supabase
        .from("school_classes")
        .select("grade, count")
        .eq("school_id", schoolRaw.id);

      if (classErr) {
        console.warn("Gagal mengambil data kelas:", classErr.message);
        // Jangan throw error, biarkan lanjut meski tanpa data kelas (fallback ke DB column)
      }

      // 3. TRANSFORM DATA
      // Masukkan schoolRaw DAN classRows ke transformer
      const cleanData = transformSchoolData(schoolRaw, classRows || []);

      setDetail(cleanData);
    } catch (e) {
      console.error("Load Detail Error:", e);
      setError(e.message || "Gagal memuat data sekolah.");
    } finally {
      setLoading(false);
    }
  }, [npsnParam]);

  // Trigger load saat mount
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Link Edit Smart (Deteksi Jenjang)
  const getEditHref = () => {
    if (!detail) return "#";
    // Ambil jenjang dari data yang sudah di-transform (TK/PAUD)
    const type = (detail.jenjang || "PAUD").toLowerCase();
    return `/dashboard/${type}/edit/${npsnParam}`;
  };

  return (
    <div className="min-h-screen bg-background md:pl-0">
      <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 pl-0 hover:bg-transparent -ml-2 sm:ml-0"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>

          <div className="flex gap-2 w-full sm:w-auto">
            {error && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadDetail}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Coba Lagi
              </Button>
            )}

            {detail && (
              <Link href={getEditHref()} className="w-full sm:w-auto">
                <Button size="sm" className="gap-2 w-full sm:w-auto">
                  <PencilLine className="h-4 w-4" /> Edit Data
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground bg-white rounded-xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
            <p>Memuat detail sekolah...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
            <p className="font-semibold mb-1">Terjadi Kesalahan</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          /* Render Tabs Component */
          <SchoolDetailsTabs school={detail} />
        )}
      </main>
    </div>
  );
}
