// src/app/components/StatCards.jsx
"use client";
import {
  Users,
  AlertTriangle,
  School,
  Loader2,
  UserCheck,
  Baby,
  Blocks,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Percent,
  Briefcase,
  AlertOctagon,
  Monitor,
  Bath,
  Armchair,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useMemo } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";

// --- HELPERS ---
const getOperatorIcon = (type) => {
  switch (type) {
    case "PAUD":
      return Baby;
    case "TK":
      return Blocks;
    case "SD":
      return BookOpen;
    case "SMP":
      return School;
    case "PKBM":
      return GraduationCap;
    default:
      return School;
  }
};

const getOperatorLabel = (type) => {
  switch (type) {
    case "PAUD":
      return "PAUD";
    case "TK":
      return "TK";
    case "SD":
      return "SD";
    case "SMP":
      return "SMP";
    case "PKBM":
      return "PKBM";
    default:
      return "Sekolah";
  }
};

const safeParse = (data) => {
  if (!data) return {};
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
};

// --- DATA CALCULATION HELPERS ---

const calculateTotalGuru = (guruObj) => {
  if (!guruObj) return 0;
  const breakdownSum =
    (Number(guruObj.pns) || 0) +
    (Number(guruObj.pppk) || 0) +
    (Number(guruObj.pppkParuhWaktu) || 0) +
    (Number(guruObj.nonAsnDapodik) || 0) +
    (Number(guruObj.nonAsnTidakDapodik) || 0);
  const directTotal = Number(guruObj.jumlahGuru) || Number(guruObj.total) || 0;
  return Math.max(breakdownSum, directTotal);
};

const calculateAsnGuru = (guruObj) => {
  if (!guruObj) return 0;
  return (Number(guruObj.pns) || 0) + (Number(guruObj.pppk) || 0);
};

const getTeacherStats = (school) => {
  if (!school) return { total: 0, asn: 0 };

  const g1 = safeParse(school.guru);
  const t1 = calculateTotalGuru(g1);
  const asn1 = calculateAsnGuru(g1);

  const meta = safeParse(school.meta);
  const g2 = safeParse(meta?.guru);
  const t2 = calculateTotalGuru(g2);
  const asn2 = calculateAsnGuru(g2);

  if (t2 > t1) return { total: t2, asn: asn2 };
  return { total: t1, asn: asn1 };
};

const getInfrastructureStats = (school) => {
  if (!school) return { heavy: 0, destroyed: 0, totalRooms: 0 };

  const meta = safeParse(school.meta);
  const sources = [
    safeParse(meta?.prasarana?.classrooms),
    safeParse(school.prasarana?.classrooms),
    safeParse(school.prasarana?.ruangKelas),
    safeParse(school.class_condition),
  ];

  const findMax = (keys) => {
    let maxVal = 0;
    sources.forEach((src) => {
      if (!src) return;
      keys.forEach((k) => {
        const val = Number(src[k]);
        if (!isNaN(val) && val > maxVal) maxVal = val;
      });
    });
    return maxVal;
  };

  const heavy = findMax([
    "heavy_damage",
    "rusakBerat",
    "rusak_berat",
    "classrooms_heavy_damage",
  ]);
  const destroyed = findMax([
    "rusakTotal",
    "total_damage",
    "rusak_total",
    "hancur",
  ]);
  const totalRooms = findMax([
    "total_room",
    "jumlah",
    "total",
    "total_classrooms",
  ]);

  return { heavy, destroyed, totalRooms };
};

// ✅ SUPER MINING FUNCTION: TIK, Toilet, Mebeulair
const getFacilityStats = (school) => {
  if (!school) return { computers: 0, toilets: 0, goodChairs: 0 };

  // Ambil object prasarana dari meta (prioritas) atau root
  const meta = safeParse(school.meta);
  const prasarana = meta?.prasarana || school.prasarana || {};

  // ==========================
  // 1. MINING TIK (Komputer)
  // ==========================
  // Cek Chromebook (biasanya di root prasarana)
  const chromebook = Number(prasarana.chromebook) || 0;

  // Cek PC (biasanya nested di furniture/mebeulair)
  const pc1 = Number(prasarana.furniture?.computer) || 0;
  const pc2 = Number(prasarana.mebeulair?.computer) || 0; // Kadang tersimpan di sini
  const pc3 = Number(prasarana.mebeulair?.komputer) || 0; // Bahasa Indo
  const pc4 = Number(prasarana.laboratorium_komputer) || 0; // Legacy

  const computers = chromebook + Math.max(pc1, pc2, pc3, pc4);

  // ==========================
  // 2. MINING TOILET (BAIK)
  // ==========================
  let toilets = 0;

  // A. Cek struktur "rooms" (Standard Form Baru)
  // path: prasarana.rooms.toilets.good
  if (prasarana.rooms?.toilets) {
    const t = prasarana.rooms.toilets;
    // Ambil good atau baik, fallback ke total jika good tidak didefinisikan tapi total ada
    toilets = Number(t.good) || Number(t.baik) || 0;
  }

  // B. Cek struktur SMP (Rinci: Male/Female)
  // path: prasarana.students_toilet.male.good
  else if (prasarana.students_toilet) {
    const stMale = Number(prasarana.students_toilet?.male?.good) || 0;
    const stFemale = Number(prasarana.students_toilet?.female?.good) || 0;
    // Kita fokus toilet siswa untuk rasio, atau bisa ditambah toilet guru
    const tGuruMale = Number(prasarana.teachers_toilet?.male?.good) || 0;
    const tGuruFemale = Number(prasarana.teachers_toilet?.female?.good) || 0;
    toilets = stMale + stFemale + tGuruMale + tGuruFemale;
  }

  // C. Cek struktur Legacy/Indo
  // path: prasarana.toiletGuruSiswa.baik
  else if (prasarana.toiletGuruSiswa) {
    toilets =
      Number(prasarana.toiletGuruSiswa.baik) ||
      Number(prasarana.toiletGuruSiswa.jumlah) ||
      0;
  }

  // D. Cek struktur Root Simple
  // path: prasarana.toilets.good
  else if (prasarana.toilets) {
    toilets =
      Number(prasarana.toilets.good) || Number(prasarana.toilets.total) || 0;
  }

  // ==========================
  // 3. MINING KURSI (BAIK)
  // ==========================
  // path: prasarana.furniture.chairs.good
  const c1 = Number(prasarana.furniture?.chairs?.good) || 0;
  // path: prasarana.mebeulair.chairs.good (varian typo)
  const c2 = Number(prasarana.mebeulair?.chairs?.good) || 0;
  // path: prasarana.mebeulair.kursi.baik (Legacy Indo)
  const c3 = Number(prasarana.mebeulair?.kursi?.baik) || 0;
  // path: prasarana.mebeulair.kursi.jumlah (Legacy Indo - Fallback)
  const c4 = Number(prasarana.mebeulair?.kursi?.jumlah) || 0;

  // Ambil nilai terbesar yang ditemukan (karena biasanya data cuma ada di salah satu format)
  const goodChairs = Math.max(c1, c2, c3);

  return { computers, toilets, goodChairs };
};

export default function StatCards({ operatorType }) {
  const isCombinedPaud = operatorType === "PAUD";

  const {
    data: dataMain,
    isLoading: loadingMain,
    totalSiswa: totalSiswaMain,
  } = useSchoolData(operatorType);

  const {
    data: dataTk,
    isLoading: loadingTk,
    totalSiswa: totalSiswaTk,
  } = useSchoolData(isCombinedPaud ? "TK" : null);

  const schoolsData = useMemo(() => {
    if (!isCombinedPaud) return dataMain || [];
    return [...(dataMain || []), ...(dataTk || [])];
  }, [dataMain, dataTk, isCombinedPaud]);

  const isLoading = isCombinedPaud ? loadingMain || loadingTk : loadingMain;

  const combinedTotalSiswa = useMemo(() => {
    if (!isCombinedPaud) return totalSiswaMain;
    if (totalSiswaMain == null && totalSiswaTk == null) return null;
    return (Number(totalSiswaMain) || 0) + (Number(totalSiswaTk) || 0);
  }, [totalSiswaMain, totalSiswaTk, isCombinedPaud]);

  const stats = useMemo(() => {
    if (isLoading || !schoolsData || schoolsData.length === 0) {
      return null;
    }

    const totalSchools = schoolsData.length;

    // 1. Siswa
    const totalStudents =
      combinedTotalSiswa ??
      schoolsData.reduce(
        (sum, school) => sum + (parseInt(school.student_count, 10) || 0),
        0
      );

    // 2. Guru & ASN
    let totalTeachers = 0;
    let totalAsn = 0;

    // 3. Infrastruktur & Fasilitas
    let totalDamagedHeavy = 0;
    let totalDamagedDestroyed = 0;
    let totalClassrooms = 0;
    let totalComputers = 0;
    let totalToilets = 0;
    let totalGoodChairs = 0;

    schoolsData.forEach((school) => {
      // Guru
      const { total, asn } = getTeacherStats(school);
      totalTeachers += total;
      totalAsn += asn;

      // Infra Fisik
      const { heavy, destroyed, totalRooms } = getInfrastructureStats(school);
      totalDamagedHeavy += heavy;
      totalDamagedDestroyed += destroyed;
      totalClassrooms += totalRooms;

      // Fasilitas
      const { computers, toilets, goodChairs } = getFacilityStats(school);
      totalComputers += computers;
      totalToilets += toilets;
      totalGoodChairs += goodChairs;
    });

    // --- KALKULASI RASIO ---

    const studentTeacherRatio =
      totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : "0";

    const asnPercentage =
      totalTeachers > 0 ? Math.round((totalAsn / totalTeachers) * 100) : 0;

    const heavyPercentage =
      totalClassrooms > 0
        ? ((totalDamagedHeavy / totalClassrooms) * 100).toFixed(1)
        : "0";

    const destroyedPercentage =
      totalClassrooms > 0
        ? ((totalDamagedDestroyed / totalClassrooms) * 100).toFixed(1)
        : "0";

    const computerRatio =
      totalComputers > 0 ? Math.round(totalStudents / totalComputers) : "∞";

    const toiletRatio =
      totalToilets > 0 ? Math.round(totalStudents / totalToilets) : "∞";

    // Defisit Kursi Logic
    const chairDeficitRaw = totalStudents - totalGoodChairs;
    const isChairCritical = chairDeficitRaw > 0;
    const chairDeficitDisplay = Math.abs(chairDeficitRaw);

    const chairSubtext = isChairCritical
      ? `${Math.round(
          (chairDeficitRaw / totalStudents) * 100
        )}% Siswa Tanpa Kursi Layak`
      : `Kebutuhan Terpenuhi (+${chairDeficitDisplay} Surplus)`;

    const operatorLabel = isCombinedPaud
      ? "PAUD & TK"
      : getOperatorLabel(operatorType);

    return [
      {
        label: `Total ${operatorLabel}`,
        value: totalSchools,
        subtext: "Unit Sekolah Terdaftar",
        icon: getOperatorIcon(operatorType),
        color: "text-blue-600",
        bg: "bg-blue-50",
        borderColor: "border-blue-200",
      },
      {
        label: "Total Siswa",
        value: totalStudents,
        subtext: `Rasio 1 Guru : ${studentTeacherRatio} Siswa`,
        icon: Users,
        color: "text-green-600",
        bg: "bg-green-50",
        borderColor: "border-green-200",
      },
      {
        label: "Total Guru",
        value: totalTeachers,
        subtext: `${asnPercentage}% Berstatus ASN`,
        icon: UserCheck,
        color: "text-purple-600",
        bg: "bg-purple-50",
        borderColor: "border-purple-200",
      },
      {
        label: "Ketersediaan TIK",
        value: totalComputers,
        subtext: `Rasio 1 Komputer : ${computerRatio} Siswa`,
        icon: Monitor,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        borderColor: "border-cyan-200",
      },
      {
        label: "Toilet Baik",
        value: totalToilets,
        subtext: `Rasio 1 Toilet : ${toiletRatio} Siswa`,
        icon: Bath,
        color: "text-teal-600",
        bg: "bg-teal-50",
        borderColor: "border-teal-200",
      },
      {
        label: isChairCritical ? "Kekurangan Kursi" : "Surplus Kursi",
        value: chairDeficitDisplay,
        subtext: chairSubtext,
        icon: isChairCritical ? Armchair : CheckCircle2,
        color: isChairCritical ? "text-rose-600" : "text-emerald-600",
        bg: isChairCritical ? "bg-rose-50" : "bg-emerald-50",
        borderColor: isChairCritical ? "border-rose-200" : "border-emerald-200",
      },
      {
        label: "R. Kelas Rusak Berat",
        value: totalDamagedHeavy,
        subtext: `${heavyPercentage}% dari Total Ruang`,
        icon: AlertTriangle,
        color: "text-orange-600",
        bg: "bg-orange-50",
        borderColor: "border-orange-200",
      },
      {
        label: "R. Kelas Rusak Total",
        value: totalDamagedDestroyed,
        subtext: `${destroyedPercentage}% (Tidak Layak Pakai)`,
        icon: AlertOctagon,
        color: "text-red-600",
        bg: "bg-red-50",
        borderColor: "border-red-200",
      },
    ];
  }, [
    schoolsData,
    isLoading,
    combinedTotalSiswa,
    operatorType,
    isCombinedPaud,
  ]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className={`rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 ${stat.borderColor}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                    {stat.value.toLocaleString("id-ID")}
                  </h3>
                </div>
                <div
                  className={`p-2.5 rounded-lg ${stat.bg} ${stat.color} shrink-0 ml-2`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center text-xs font-medium text-gray-500">
                  {stat.icon === Monitor ? (
                    <Monitor className="w-3.5 h-3.5 mr-1.5 text-cyan-500" />
                  ) : stat.icon === Bath ? (
                    <Bath className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
                  ) : stat.icon === Armchair ? (
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                  ) : stat.icon === CheckCircle2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  ) : stat.icon === AlertOctagon ? (
                    <AlertOctagon className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  )}
                  {stat.subtext}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
