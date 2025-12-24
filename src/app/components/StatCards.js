"use client";
import {
  Users,
  AlertTriangle,
  Monitor,
  GraduationCap,
  Baby,
  Blocks,
  BookOpen,
  School,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useMemo } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";

// DIKEMBALIKAN ISINYA: Fungsi helper untuk ikon dan label
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

export default function StatCards({ operatorType }) {
  // Gunakan custom hook untuk mendapatkan data
  const { data: schoolsData, isLoading, totalSiswa } = useSchoolData(operatorType);

  // Hitung statistik secara dinamis menggunakan useMemo
  const calculatedStats = useMemo(() => {
    if (isLoading || schoolsData.length === 0) {
      return {
        totalSchools: 0,
        totalStudents: 0,
        totalTeachers: 0, // Data guru belum ada di JSON, jadi kita beri 0
        totalDamaged: 0,
      };
    }

    // Kalkulasi dari data yang ada
    const totalStudents = schoolsData.reduce(
      (sum, school) => sum + (parseInt(school.student_count, 10) || 0),
      0
    );
    const totalDamaged = schoolsData.reduce(
      (sum, school) =>
        sum +
        (parseInt(school.class_condition?.classrooms_heavy_damage, 10) || 0),
      0
    );
    const totalSchools = schoolsData.length;

    return {
      totalSchools,
      totalStudents,
      totalTeachers: 0, // Placeholder
      totalDamaged,
    };
  }, [schoolsData, isLoading]);

  const stats = useMemo(() => {
    const operatorLabel = getOperatorLabel(operatorType);
    const OperatorIcon = getOperatorIcon(operatorType);

    return [
      {
        icon: School,
        label: `Jumlah ${operatorLabel}`,
        value: calculatedStats.totalSchools,
      },
      {
        icon: Users,
        label: "Total Siswa",
        value: totalSiswa,
      },
      {
        icon: GraduationCap,
        label: "Total Guru",
        value: calculatedStats.totalTeachers,
      },
      {
        icon: AlertTriangle,
        label: "Ruang Kelas Rusak Berat",
        value: calculatedStats.totalDamaged,
      },
    ];
  }, [operatorType, calculatedStats]);

  if (isLoading) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p>Menghitung statistik...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="rounded-xl shadow-sm border-border/50 hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-semibold text-card-foreground">
                      {stat.value.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-blue-50`}>
                    <Icon className={`h-6 w-6 text-blue-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
