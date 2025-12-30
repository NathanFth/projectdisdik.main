// src/app/dashboard/sd/[npsn]/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { BookOpen, ArrowLeft, Loader2, PencilLine } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import SchoolDetailsTabs from "@/app/components/SchoolDetailsTabs";
import { supabase } from "@/lib/supabase/lib/client";

export default function SdDetailPage() {
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

        if (!npsnParam) {
          throw new Error("NPSN tidak valid");
        }

        const { data, error } = await supabase.rpc(
          "get_school_detail_by_npsn",
          {
            input_npsn: npsnParam,
          }
        );

        if (error) {
          throw new Error(error.message || "Gagal memuat data dari database");
        }

        if (!data) {
          throw new Error("Sekolah dengan NPSN tersebut tidak ditemukan");
        }

        // ✅ row didefinisikan DI SINI, jadi bisa dipakai untuk log & setState
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error("Data kosong dari RPC");

        // ✅ DEBUG (aman, row pasti ada)
        console.log("RPC row keys:", Object.keys(row || {}));
        console.log("RPC row sample:", row);
        console.log("RPC prasarana_json:", row?.prasarana_json);
        console.log("RPC prasarana:", row?.prasarana);
        console.log("RPC flat:", {
          luas_tanah: row?.luas_tanah,
          luas_bangunan: row?.luas_bangunan,
          luas_halaman: row?.luas_halaman,
          jumlah_gedung: row?.jumlah_gedung,
          chromebook: row?.chromebook,
        });

        if (!ignore) {
          setDetail(row);
        }
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
            <span>Detail SD</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Detail SD
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

          <Link href="/dashboard/sd">
            <Button variant="outline" size="sm">
              Ke Data SD
            </Button>
          </Link>

          {npsnParam && (
            <Link href={`/dashboard/sd/edit/${npsnParam}`}>
              <Button size="sm">
                <PencilLine className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
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
