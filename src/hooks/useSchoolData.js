// src/hooks/useSchoolData.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/lib/client";

function formatSupabaseError(err) {
  if (!err) return "Terjadi kesalahan (error kosong).";
  if (typeof err === "string") return err;

  const message =
    err.message ||
    err.error_description ||
    err.msg ||
    "Terjadi kesalahan (tanpa message).";

  const parts = [message];

  if (err.code) parts.push(`code=${err.code}`);
  if (err.details) parts.push(`details=${err.details}`);
  if (err.hint) parts.push(`hint=${err.hint}`);

  // jika object tidak punya message tapi punya isi lain
  if (parts.length === 1) {
    try {
      parts.push(`raw=${JSON.stringify(err)}`);
    } catch {}
  }

  return parts.join(" | ");
}

/**
 * Buat array sintetis ringan agar StatCards lama tetap kompatibel:
 * - length = total_sekolah
 * - element[0] berisi agregat total (guru/prasarana/fasilitas) agar loop StatCards menghasilkan angka benar
 * - element lainnya berisi nol
 */
function buildSyntheticSchools(stats, operatorType) {
  const totalSekolah = Number(stats?.total_sekolah) || 0;
  if (totalSekolah <= 0) return [];

  const totalSiswa = Number(stats?.total_siswa) || 0;
  const totalGuru = Number(stats?.total_guru) || 0;
  const totalAsn = Number(stats?.total_asn) || 0;

  const totalRuang = Number(stats?.total_ruang_kelas) || 0;
  const rusakBerat = Number(stats?.total_rusak_berat) || 0;
  const rusakTotal = Number(stats?.total_rusak_total) || 0;

  const totalToiletBaik = Number(stats?.total_toilet_baik) || 0;
  const totalKursiBaik = Number(stats?.total_kursi_baik) || 0;

  const totalChromebook = Number(stats?.total_chromebook) || 0;
  const totalKomputerAsset = Number(stats?.total_komputer_asset) || 0;
  const totalKomputer =
    Number(stats?.total_komputer) || totalChromebook + totalKomputerAsset;

  // Agar fungsi StatCards tidak double count:
  // - chromebook diset sesuai totalChromebook
  // - komputer non-chromebook ditempatkan di furniture.computer (dipakai Math.max di StatCards)
  const komputerNonChromebook = Math.max(0, totalKomputer - totalChromebook);

  // element agregat (index 0)
  const aggregatedRow = {
    jenjang: operatorType,
    student_count: totalSiswa,

    guru: {
      jumlahGuru: totalGuru,
      // asn = pns + pppk
      pns: totalAsn, // jika Anda ingin pecah pns/pppk, ubah dari backend (opsional)
      pppk: 0,
      pppkParuhWaktu: 0,
      nonAsnDapodik: Math.max(0, totalGuru - totalAsn),
      nonAsnTidakDapodik: 0,
    },

    class_condition: {
      // dipakai getInfrastructureStats (StatCards Anda)
      total_classrooms: totalRuang,
      classrooms_heavy_damage: rusakBerat,
      rusakTotal: rusakTotal,
    },

    meta: {
      prasarana: {
        chromebook: totalChromebook,
        furniture: {
          computer: komputerNonChromebook,
          chairs: { good: totalKursiBaik },
        },
        rooms: {
          toilets: { good: totalToiletBaik },
        },
      },
      guru: {
        jumlahGuru: totalGuru,
        pns: totalAsn,
        pppk: 0,
        pppkParuhWaktu: 0,
        nonAsnDapodik: Math.max(0, totalGuru - totalAsn),
        nonAsnTidakDapodik: 0,
      },
    },
  };

  const zeroRow = {
    jenjang: operatorType,
    student_count: 0,
    guru: {
      jumlahGuru: 0,
      pns: 0,
      pppk: 0,
      pppkParuhWaktu: 0,
      nonAsnDapodik: 0,
      nonAsnTidakDapodik: 0,
    },
    class_condition: {
      total_classrooms: 0,
      classrooms_heavy_damage: 0,
      rusakTotal: 0,
    },
    meta: {
      prasarana: {
        chromebook: 0,
        furniture: {
          computer: 0,
          chairs: { good: 0 },
        },
        rooms: {
          toilets: { good: 0 },
        },
      },
      guru: {
        jumlahGuru: 0,
        pns: 0,
        pppk: 0,
        pppkParuhWaktu: 0,
        nonAsnDapodik: 0,
        nonAsnTidakDapodik: 0,
      },
    },
  };

  // Array besar tapi ringan: 5.000 object kecil masih aman dibanding fetch row detail DB
  return Array.from({ length: totalSekolah }, (_, i) =>
    i === 0 ? aggregatedRow : zeroRow,
  );
}

export function useSchoolData(operatorType) {
  const [data, setData] = useState([]);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!operatorType) {
      setData([]);
      setTotalSiswa(0);
      setStats(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_dashboard_stats",
        { p_jenjang: operatorType },
      );

      if (rpcError) throw rpcError;

      // RPC mengembalikan JSON object
      const st = rpcData && typeof rpcData === "object" ? rpcData : null;
      if (!st)
        throw new Error("RPC get_dashboard_stats mengembalikan data kosong.");

      setStats(st);

      const total = Number(st.total_siswa) || 0;
      setTotalSiswa(total);

      // Kompatibilitas dengan StatCards lama
      const synthetic = buildSyntheticSchools(st, operatorType);
      setData(synthetic);
    } catch (e) {
      console.error("useSchoolData(get_dashboard_stats) error:", e);
      setStats(null);
      setData([]);
      setTotalSiswa(0);
      setError(formatSupabaseError(e));
    } finally {
      setIsLoading(false);
    }
  }, [operatorType]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    stats,
    isLoading,
    error,
    reload: fetchStats,
    totalSiswa,
  };
}
