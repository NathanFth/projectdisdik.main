"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/lib/client";

// Biar StatCards tetap jalan walau bentuk data dari RPC beda-beda
function normalizeForStats(row, operatorType) {
  const studentCount =
    Number(
      row?.student_count ??
        row?.studentCount ??
        row?.siswa?.jumlahSiswa ??
        row?.siswa?.jumlah_siswa ??
        0
    ) || 0;

  const heavyDamage =
    Number(
      row?.class_condition?.classrooms_heavy_damage ??
        row?.prasarana?.ruangKelas?.rusakBerat ??
        row?.prasarana?.ruangKelas?.heavy_damage ??
        0
    ) || 0;

  // pastikan field yang dipakai StatCards selalu ada
  const class_condition = {
    ...(row?.class_condition || {}),
    classrooms_heavy_damage: heavyDamage,
  };

  // jenjang defensif (buat filter TK/PAUD kalau perlu)
  const jenjang = row?.jenjang ?? row?.meta?.jenjang ?? operatorType;

  return {
    ...row,
    jenjang,
    student_count: studentCount,
    class_condition,
  };
}

export function useSchoolData(operatorType) {
  const [data, setData] = useState([]);
  const [totalSiswa, setTotalSiswa] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFromDb = useCallback(async () => {
    if (!operatorType) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ SUPABASE ONLY
      const { data: dbData, error: dbErr } = await supabase.rpc(
        "get_schools_full_report",
        { jenjang_filter: operatorType }
      );

      console.log("sekolah detail : ", dbData);
      // Menggunakan satu kali reduce untuk mendapatkan total male dan female
      const totals = dbData.reduce(
        (acc, school) => {
          acc.male += school.st_male;
          acc.female += school.st_female;
          return acc;
        },
        { male: 0, female: 0 }
      ); // <-- Nilai awal diatur sebagai objek dengan 0

      const totalSiswa = totals.female + totals.male;
      setTotalSiswa(totalSiswa);

      if (dbErr) throw new Error(dbErr.message || "Gagal memuat data sekolah");

      const raw = Array.isArray(dbData) ? dbData : [];
      let normalized = raw.map((r) => normalizeForStats(r, operatorType));

      // Filter defensif TK/PAUD jika jenjang tersedia
      if (operatorType === "TK") {
        normalized = normalized.filter(
          (s) => String(s.jenjang || "").toUpperCase() === "TK"
        );
      } else if (operatorType === "PAUD") {
        const hasJenjang = normalized.some((s) => s.jenjang != null);
        if (hasJenjang) {
          normalized = normalized.filter(
            (s) => String(s.jenjang || "").toUpperCase() !== "TK"
          );
        }
      }

      setData(normalized);
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan saat memuat data");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [operatorType]);

  useEffect(() => {
    fetchFromDb();
  }, [fetchFromDb]);

  // expose reload kalau nanti dibutuhkan
  return { data, isLoading, error, reload: fetchFromDb, totalSiswa };
}
