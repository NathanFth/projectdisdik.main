// src/app/dashboard/sd/[npsn]/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import SchoolDetailsTabs from "@/app/components/SchoolDetailsTabs";
import {
  ArrowLeft,
  Loader2,
  PencilLine,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase/lib/client";
import { transformSchoolData } from "@/lib/utils/school-data-transformer";

export default function SdDetailPage() {
  const params = useParams();
  const npsnParam = Array.isArray(params?.npsn) ? params.npsn[0] : params?.npsn;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

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

      // 2. Fetch Data Kelas (Penting untuk struktur Kelas 1-6 SD)
      const { data: classRows, error: classErr } = await supabase
        .from("school_classes")
        .select("grade, count")
        .eq("school_id", schoolRaw.id);

      if (classErr) {
        console.warn("Gagal mengambil data kelas:", classErr.message);
      }

      // 3. TRANSFORM DATA (Pusat Logika)
      // Transformer akan mendeteksi jenjang SD dan menyusun siswa ke Kelas 1-6
      const cleanData = transformSchoolData(schoolRaw, classRows || []);

      setDetail(cleanData);
    } catch (e) {
      console.error("Load Detail Error:", e);
      setError(e.message || "Gagal memuat data sekolah.");
    } finally {
      setLoading(false);
    }
  }, [npsnParam]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Smart Edit Link
  const getEditHref = () => {
    if (!detail) return "#";
    // Untuk SD routingnya pasti ke folder /sd
    return `/dashboard/sd/edit/${npsnParam}`;
  };

  return (
    <div className="min-h-screen bg-background md:pl-0">
      <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
        {/* --- HEADER ACTIONS --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="gap-2 pl-0 hover:bg-transparent -ml-2 sm:ml-0 w-fit"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            {detail && (
              <div className="mt-1 ml-1 hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                  {detail.namaSekolah}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>{detail.npsn}</span>
                  <span>•</span>
                  <span>{detail.kecamatan}</span>
                </div>
              </div>
            )}
          </div>

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

        {/* --- CONTENT AREA --- */}
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
          /* Render Tabs Component yang reusable */
          <SchoolDetailsTabs school={detail} />
        )}
      </main>
    </div>
  );
}
