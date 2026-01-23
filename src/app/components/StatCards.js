// src/app/components/StatCards.js
"use client";

import {
  Users,
  AlertTriangle,
  School,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Baby,
  Blocks,
  BookOpen,
  AlertOctagon,
  Monitor,
  Bath,
  Armchair,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useMemo } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";

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

function sumStats(a, b) {
  const A = a || {};
  const B = b || {};
  return {
    total_sekolah:
      (Number(A.total_sekolah) || 0) + (Number(B.total_sekolah) || 0),
    total_siswa: (Number(A.total_siswa) || 0) + (Number(B.total_siswa) || 0),
    total_guru: (Number(A.total_guru) || 0) + (Number(B.total_guru) || 0),
    total_asn: (Number(A.total_asn) || 0) + (Number(B.total_asn) || 0),
    total_ruang_kelas:
      (Number(A.total_ruang_kelas) || 0) + (Number(B.total_ruang_kelas) || 0),
    total_rusak_berat:
      (Number(A.total_rusak_berat) || 0) + (Number(B.total_rusak_berat) || 0),
    total_rusak_total:
      (Number(A.total_rusak_total) || 0) + (Number(B.total_rusak_total) || 0),
    total_komputer:
      (Number(A.total_komputer) || 0) + (Number(B.total_komputer) || 0),
    total_toilet_baik:
      (Number(A.total_toilet_baik) || 0) + (Number(B.total_toilet_baik) || 0),
    total_kursi_baik:
      (Number(A.total_kursi_baik) || 0) + (Number(B.total_kursi_baik) || 0),
  };
}

export default function StatCards({ operatorType }) {
  const isCombinedPaud = operatorType === "PAUD";

  const {
    stats: statsMain,
    isLoading: loadingMain,
    error: errMain,
  } = useSchoolData(operatorType);
  const {
    stats: statsTk,
    isLoading: loadingTk,
    error: errTk,
  } = useSchoolData(isCombinedPaud ? "TK" : null);

  const isLoading = isCombinedPaud ? loadingMain || loadingTk : loadingMain;
  const error = isCombinedPaud ? errMain || errTk : errMain;

  const totals = useMemo(() => {
    if (!statsMain && !statsTk) return null;
    return isCombinedPaud ? sumStats(statsMain, statsTk) : statsMain;
  }, [statsMain, statsTk, isCombinedPaud]);

  const cards = useMemo(() => {
    if (isLoading || !totals) return null;

    const totalSchools = Number(totals.total_sekolah) || 0;
    const totalStudents = Number(totals.total_siswa) || 0;
    const totalTeachers = Number(totals.total_guru) || 0;
    const totalAsn = Number(totals.total_asn) || 0;

    const totalClassrooms = Number(totals.total_ruang_kelas) || 0;
    const totalDamagedHeavy = Number(totals.total_rusak_berat) || 0;
    const totalDamagedDestroyed = Number(totals.total_rusak_total) || 0;

    const totalComputers = Number(totals.total_komputer) || 0;
    const totalToilets = Number(totals.total_toilet_baik) || 0;
    const totalGoodChairs = Number(totals.total_kursi_baik) || 0;

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

    const chairDeficitRaw = totalStudents - totalGoodChairs;
    const isChairCritical = chairDeficitRaw > 0;
    const chairDeficitDisplay = Math.abs(chairDeficitRaw);

    const chairSubtext = isChairCritical
      ? `${totalStudents > 0 ? Math.round((chairDeficitRaw / totalStudents) * 100) : 0}% Siswa Tanpa Kursi Layak`
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
        borderColor: isChairCritical ? "border-rose-200" : "border-emerald-50",
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
  }, [totals, isLoading, operatorType, isCombinedPaud]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-xl text-red-600 text-center">
        <h3 className="font-bold mb-1">Gagal Memuat Statistik</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!cards) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((stat, index) => {
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
                    {Number(stat.value || 0).toLocaleString("id-ID")}
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
