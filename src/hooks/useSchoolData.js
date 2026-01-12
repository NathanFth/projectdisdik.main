// src/hooks/useSchoolData.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/lib/client";

/**
 * Helper untuk memastikan data dari database (RPC) dipetakan dengan benar
 * ke properti yang diharapkan oleh komponen StatCards.
 */
function normalizeForStats(row, operatorType) {
  // Ambil student_count dari berbagai kemungkinan sumber (Prioritas: Kolom Fisik > RPC Object)
  const studentCount =
    Number(
      row?.student_count ??
        row?.studentCount ??
        row?.siswa?.jumlahSiswa ?? // Sesuai output RPC get_schools_full_report
        row?.siswa?.jumlah_siswa ??
        0
    ) || 0;

  // Mendukung berbagai penamaan field prasarana rusak berat
  const heavyDamage =
    Number(
      row?.class_condition?.classrooms_heavy_damage ??
        row?.class_condition?.rusak_berat ??
        row?.prasarana?.ruangKelas?.rusakBerat ??
        row?.prasarana?.ruangKelas?.heavy_damage ??
        0
    ) || 0;

  // Pastikan field class_condition selalu ada agar StatCards tidak error saat mining data
  const class_condition = {
    ...(row?.class_condition || {}),
    classrooms_heavy_damage: heavyDamage,
  };

  // Tentukan jenjang secara defensif
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
  const [totalSiswa, setTotalSiswa] = useState(0); // Inisialisasi angka 0, jangan string kosong
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFromDb = useCallback(async () => {
    // Jika operatorType kosong (misal saat proses loading auth), jangan fetch dulu.
    if (!operatorType) {
      setData([]);
      setTotalSiswa(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ Memanggil RPC Full Report (Pastikan nama ini ada di Supabase)
      const { data: dbData, error: dbErr } = await supabase.rpc(
        "get_schools_full_report",
        { jenjang_filter: operatorType }
      );

      if (dbErr)
        throw new Error(dbErr.message || "Gagal memuat data statistik sekolah");

      // Handle null jika jsonb_agg tidak menemukan data
      const raw = Array.isArray(dbData) ? dbData : [];

      // ✅ Hitung total male & female secara aman (Gunakan 0 jika null)
      const totals = raw.reduce(
        (acc, school) => {
          acc.male += Number(school.st_male) || 0;
          acc.female += Number(school.st_female) || 0;
          return acc;
        },
        { male: 0, female: 0 }
      );

      // Set total siswa dari gender breakdown atau fallback ke student_count jika gender 0
      const totalByGender = totals.female + totals.male;
      setTotalSiswa(totalByGender);

      let normalized = raw.map((r) => normalizeForStats(r, operatorType));

      // Filter tambahan untuk memisahkan PAUD dan TK jika datanya tercampur di database
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
      console.error("Error useSchoolData:", err);
      setError(err?.message || "Terjadi kesalahan saat memuat data");
      setData([]);
      setTotalSiswa(0);
    } finally {
      setIsLoading(false);
    }
  }, [operatorType]);

  useEffect(() => {
    fetchFromDb();
  }, [fetchFromDb]);

  return {
    data,
    isLoading,
    error,
    reload: fetchFromDb,
    totalSiswa,
  };
}
