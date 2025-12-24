// src/app/components/SchoolDetailsTabs.jsx
"use client";

import { useState } from "react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  School,
  MapPin,
  Users,
  GraduationCap,
  Building,
  Calendar,
  UserCheck,
  ClipboardList,
  UserPlus,
  TrendingUp,
  Armchair,
  Laptop,
  Layers,
  FlaskConical,
  Computer,
  Languages,
  Library,
  Briefcase,
  PersonStanding,
  HeartPulse,
  //Wrench, // --- BARU --- Tambahkan Ikon Wrench
} from "lucide-react";

// =========================
// ✅ HELPERS (BARU - PATCH MINIMAL, TIDAK HILANGKAN FITUR)
// =========================
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeGuruFromSchool(school) {
  const empty = {
    jumlahGuru: 0,
    pns: 0,
    pppk: 0,
    pppkParuhWaktu: 0,
    nonAsnDapodik: 0,
    nonAsnTidakDapodik: 0,
    kekuranganGuru: 0,
  };

  if (!school) return empty;

  // Di beberapa route/detail page, `school.guru` bisa ada tapi kosong/parsial.
  // Kalau kita return hanya karena object-nya ada, fallback meta/staff_summary tidak kepakai.

  const safeParseJson = (v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  const coerceGuruObject = (raw) => {
    const obj = safeParseJson(raw);
    return obj && typeof obj === "object" ? obj : null;
  };

  const breakdownSum = (g) => {
    if (!g) return 0;
    return (
      toNum(g.pns) +
      toNum(g.pppk) +
      toNum(g.pppkParuhWaktu) +
      toNum(g.nonAsnDapodik) +
      toNum(g.nonAsnTidakDapodik)
    );
  };

  const schoolGuru = coerceGuruObject(school.guru);
  const metaGuru = coerceGuruObject(school.meta?.guru);

  // staff_summary bisa datang sebagai array / object / string JSON (jaga-jaga)
  const ssRaw =
    school.staff_summary ??
    school.staffSummary ??
    school.staff_summaries ??
    school.staffSummaries;

  const ssParsed = safeParseJson(ssRaw);
  const ss = Array.isArray(ssParsed)
    ? ssParsed
    : ssParsed && typeof ssParsed === "object"
    ? Object.entries(ssParsed).map(([role, count]) => ({ role, count }))
    : [];

  const staffGuru = (() => {
    if (!Array.isArray(ss) || ss.length === 0) return null;

    const byRole = {};
    ss.forEach((row) => {
      const role = String(row?.role || "")
        .trim()
        .toLowerCase();
      if (!role) return;
      byRole[role] = toNum(row?.count);
    });

    return {
      jumlahGuru: toNum(byRole.guru_total),
      pns: toNum(byRole.guru_pns),
      pppk: toNum(byRole.guru_pppk),
      pppkParuhWaktu: toNum(byRole.guru_pppk_paruh_waktu),
      nonAsnDapodik: toNum(byRole.guru_non_asn_dapodik),
      nonAsnTidakDapodik: toNum(byRole.guru_non_asn_tidak_dapodik),
      kekuranganGuru: toNum(byRole.guru_kekurangan),
    };
  })();

  const schoolBreakdown = breakdownSum(schoolGuru);
  const metaBreakdown = breakdownSum(metaGuru);
  const staffBreakdown = breakdownSum(staffGuru);

  // Pilih sumber terbaik:
  // - Prioritas: school.guru -> meta.guru -> staff_summary
  // - Tapi kalau sumber lebih tinggi tidak punya breakdown, jatuhkan ke yang punya breakdown.
  const pickBestGuruSource = () => {
    if (schoolGuru && schoolBreakdown > 0) return schoolGuru;
    if (metaGuru && metaBreakdown > 0) return metaGuru;
    if (staffGuru && staffBreakdown > 0) return staffGuru;

    // Kalau tidak ada breakdown, tetap tampilkan minimal total/kekurangan jika ada
    if (
      schoolGuru &&
      (toNum(schoolGuru.jumlahGuru) > 0 || toNum(schoolGuru.kekuranganGuru) > 0)
    )
      return schoolGuru;
    if (
      metaGuru &&
      (toNum(metaGuru.jumlahGuru) > 0 || toNum(metaGuru.kekuranganGuru) > 0)
    )
      return metaGuru;
    if (
      staffGuru &&
      (toNum(staffGuru.jumlahGuru) > 0 || toNum(staffGuru.kekuranganGuru) > 0)
    )
      return staffGuru;

    return null;
  };

  const best = pickBestGuruSource();
  if (!best) return empty;

  const normalized = {
    ...empty,
    jumlahGuru: toNum(best.jumlahGuru),
    pns: toNum(best.pns),
    pppk: toNum(best.pppk),
    pppkParuhWaktu: toNum(best.pppkParuhWaktu),
    nonAsnDapodik: toNum(best.nonAsnDapodik),
    nonAsnTidakDapodik: toNum(best.nonAsnTidakDapodik),
    kekuranganGuru: toNum(best.kekuranganGuru),
  };

  // Kalau total belum diisi tapi rincian ada, hitung total dari rincian.
  const totalFromBreakdown =
    normalized.pns +
    normalized.pppk +
    normalized.pppkParuhWaktu +
    normalized.nonAsnDapodik +
    normalized.nonAsnTidakDapodik;

  if ((normalized.jumlahGuru || 0) === 0 && totalFromBreakdown > 0) {
    normalized.jumlahGuru = totalFromBreakdown;
  }

  return normalized;
}


// --- KONSTANTA (sama seperti di modal) ---
const PAUD_ROMBEL_TYPES = [
  { key: "tka", label: "TK A" },
  { key: "tkb", label: "TK B" },
  { key: "kb", label: "Kelompok Bermain (KB)" },
  { key: "sps_tpa", label: "SPS / TPA" },
];

const PKBM_PAKETS = {
  A: { name: "Paket A (Setara SD)", grades: [1, 2, 3, 4, 5, 6] },
  B: { name: "Paket B (Setara SMP)", grades: [7, 8, 9] },
  C: { name: "Paket C (Setara SMA)", grades: [10, 11, 12] },
};

const LANJUT_OPTIONS = {
  SD: {
    dalamKab: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    luarKab: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
  },
  SMP: {
    dalamKab: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    luarKab: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
  },
  PAUD: {
    dalamKab: [
      { key: "sd", label: "SD" },
      { key: "mi", label: "MI" },
    ],
    luarKab: [
      { key: "sd", label: "SD" },
      { key: "mi", label: "MI" },
    ],
  },
  PKBM: {
    paketB: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "paketC", label: "Lanjut Paket C" },
    ],
    paketC: [
      { key: "pt", label: "Perguruan Tinggi" },
      { key: "bekerja", label: "Bekerja" },
    ],
  },
};
LANJUT_OPTIONS.TK = LANJUT_OPTIONS.PAUD; // Alias

export default function SchoolDetailsTabs({ school }) {
  const [activeTab, setActiveTab] = useState("basic");
  if (!school)
    return <div className="p-6 text-muted-foreground">Memuat data…</div>;

  const schoolType = school.schoolType || school.jenjang;

  const isSd = schoolType === "SD";
  const isSmp = schoolType === "SMP";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";
  const isPkbm = schoolType === "PKBM";

  // ✅ BARU: guru normalized (tanpa ngubah UI/fitur lain)
  const guruNormalized = normalizeGuruFromSchool(school);

  const getStatusColor = (status) => {
    switch (status) {
      case "Aktif":
        return "bg-green-100 text-green-700 border-green-200";
      case "Data Belum Lengkap":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const sumNestedObject = (obj) => {
    if (!obj) return 0;
    return Object.values(obj).reduce((total, value) => {
      if (typeof value === "object" && value !== null) {
        if ("l" in value && "p" in value) {
          return total + (Number(value.l) || 0) + (Number(value.p) || 0);
        }
        return total + sumNestedObject(value);
      }
      return total + (Number(value) || 0);
    }, 0);
  };

  const getTotalAbk = () => sumNestedObject(school.siswaAbk);

  const getTotalFacilities = () => {
    let total = 0;
    const prasarana = school.prasarana || {};

    if (isSmp) {
      const facilities = [
        school.class_condition,
        school.library,
        school.laboratory_comp,
        school.laboratory_langua,
        school.laboratory_ipa,
        school.laboratory_fisika,
        school.laboratory_biologi,
        school.kepsek_room,
        school.teacher_room,
        school.administration_room,
        school.uks_room,
        school.teachers_toilet,
        school.students_toilet,
      ];
      facilities.forEach((facility) => {
        if (facility) {
          if (typeof facility.total_room !== "undefined")
            total += Number(facility.total_room);
          if (typeof facility.total_all !== "undefined")
            total += Number(facility.total_all);
          if (facility.male && facility.female) {
            total +=
              (Number(facility.male.total_all) || 0) +
              (Number(facility.female.total_all) || 0);
          }
        }
      });
    } else {
      const facilities = [
        prasarana.classrooms,
        prasarana.ruangKelas,
        prasarana.ruangPerpustakaan,
        prasarana.ruangLaboratorium,
        prasarana.ruangGuru,
        prasarana.ruangUks,
        prasarana.toiletGuruSiswa,
        prasarana.rumahDinas,
        prasarana.gedung,
      ];
      facilities.forEach((facility) => {
        if (facility) {
          const jumlah = facility.total || facility.jumlah || 0;
          total += Number(jumlah);
        }
      });
    }
    return total;
  };

  const tabs = [
    {
      id: "basic",
      label: "Informasi Dasar",
      icon: <School className="h-4 w-4" />,
    },
    {
      id: "students",
      label: "Data Siswa",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "graduation",
      label: "Siswa Lanjut",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      id: "teachers",
      label: "Data Guru",
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      id: "facilities",
      label: "Prasarana",
      icon: <Building className="h-4 w-4" />,
    },
    {
      id: "institutional",
      label: "Kelembagaan",
      icon: <ClipboardList className="h-4 w-4" />,
    },
  ];

  // ======== sections dari modal =========
  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-card-foreground mb-1">
              {school.name || school.namaSekolah}
            </h3>
            <p className="text-primary font-mono text-sm">{school.npsn}</p>
          </div>
          <Badge
            className={`rounded-full ${getStatusColor(school.dataStatus)}`}
          >
            {school.dataStatus || "Aktif"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Kec. {school.kecamatan}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>
              {schoolType} - {school.type || school.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Update:{" "}
              {school.lastUpdated || new Date().toLocaleDateString("id-ID")}
            </span>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-card-foreground mb-3">Ringkasan Data</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">
              {school.student_count || school.siswa?.jumlahSiswa || 0}
            </p>
            <p className="text-xs text-blue-600">Total Siswa</p>
          </div>

          {/* ✅ PATCH: Total Guru ambil dari guruNormalized */}
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <GraduationCap className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {guruNormalized.jumlahGuru || 0}
            </p>
            <p className="text-xs text-green-600">Total Guru</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Building className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">
              {getTotalFacilities()}
            </p>
            <p className="text-xs text-purple-600">Total Ruangan</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <UserPlus className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">
              {getTotalAbk()}
            </p>
            <p className="text-xs text-orange-600">Siswa ABK</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudentsInfo = () => {
    const renderHeader = () => (
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Kelas / Kelompok
          </th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            Laki-laki
          </th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            Perempuan
          </th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            Total
          </th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            Rombel
          </th>
        </tr>
      </thead>
    );

    const renderRow = (label, siswaData, rombelData, abkData) => {
      const siswa = siswaData || { l: 0, p: 0 };
      const totalSiswa = (Number(siswa.l) || 0) + (Number(siswa.p) || 0);
      const rombel = rombelData || 0;
      const abk = abkData || { l: 0, p: 0 };
      const totalAbk = (Number(abk.l) || 0) + (Number(abk.p) || 0);

      return (
        <tr key={label}>
          <td className="px-4 py-3 text-sm font-medium text-gray-900">
            {label}
            {totalAbk > 0 && (
              <p className="text-xs text-orange-600 font-normal">
                {totalAbk} Siswa ABK
              </p>
            )}
          </td>
          <td className="px-4 py-3 text-sm text-center">{siswa.l || 0}</td>
          <td className="px-4 py-3 text-sm text-center">{siswa.p || 0}</td>
          <td className="px-4 py-3 text-sm text-center font-medium">
            {totalSiswa}
          </td>
          <td className="px-4 py-3 text-sm text-center">{rombel || 0}</td>
        </tr>
      );
    };

    const renderStudentTable = (title, items, getRowData) => (
      <div>
        <h4 className="text-card-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> {title}
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
            {renderHeader()}
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => getRowData(item))}
            </tbody>
          </table>
        </div>
      </div>
    );

    if (isSd)
      return renderStudentTable("Siswa per Kelas", [1, 2, 3, 4, 5, 6], (k) =>
        renderRow(
          `Kelas ${k}`,
          school.siswa?.[`kelas${k}`],
          school.rombel?.[`kelas${k}`],
          school.siswaAbk?.[`kelas${k}`]
        )
      );
    if (isSmp)
      return renderStudentTable("Siswa per Kelas", [7, 8, 9], (k) =>
        renderRow(
          `Kelas ${k}`,
          school.siswa?.[`kelas${k}`],
          school.rombel?.[`kelas${k}`],
          school.siswaAbk?.[`kelas${k}`]
        )
      );
    if (isPaud)
      return renderStudentTable(
        "Siswa per Kelompok",
        PAUD_ROMBEL_TYPES,
        (type) =>
          renderRow(
            type.label,
            school.siswa?.[type.key],
            school.rombel?.[type.key],
            school.siswaAbk?.[type.key]
          )
      );
    if (isPkbm) {
      return (
        <div>
          <h4 className="text-card-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Siswa per Paket
          </h4>
          <Tabs defaultValue="A" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="A">{PKBM_PAKETS.A.name}</TabsTrigger>
              <TabsTrigger value="B">{PKBM_PAKETS.B.name}</TabsTrigger>
              <TabsTrigger value="C">{PKBM_PAKETS.C.name}</TabsTrigger>
            </TabsList>
            {Object.entries(PKBM_PAKETS).map(([key, paket]) => (
              <TabsContent key={key} value={key}>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                    {renderHeader()}
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paket.grades.map((k) =>
                        renderRow(
                          `Kelas ${k}`,
                          school.siswa?.[`paket${key}`]?.[`kelas${k}`],
                          school.rombel?.[`paket${key}`]?.[`kelas${k}`],
                          school.siswaAbk?.[`paket${key}`]?.[`kelas${k}`]
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      );
    }
    return (
      <p className="text-muted-foreground">
        Tampilan data siswa tidak tersedia.
      </p>
    );
  };

  const renderGraduationInfo = () => {
    const options = LANJUT_OPTIONS[schoolType];
    if (!options)
      return (
        <p className="text-muted-foreground">
          Tidak berlaku untuk jenjang ini.
        </p>
      );

    const renderDataTable = (title, data, optionList) => {
      if (!optionList) return null;
      return (
        <div>
          <h4 className="text-card-foreground mb-3 font-medium">{title}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {optionList.map((opt) => {
              const value = data?.[opt.key] || 0;
              return (
                <div
                  key={opt.key}
                  className="bg-gray-50 border rounded-lg p-4 text-center"
                >
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-600">{opt.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    if (isPkbm) {
      return (
        <div className="space-y-6">
          {renderDataTable(
            "Kelanjutan Lulusan Paket B",
            school.lulusanPaketB,
            options.paketB
          )}
          {renderDataTable(
            "Kelanjutan Lulusan Paket C",
            school.lulusanPaketC,
            options.paketC
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderDataTable(
          "Melanjutkan Dalam Kabupaten",
          school.siswaLanjutDalamKab,
          options.dalamKab
        )}
        {renderDataTable(
          "Melanjutkan Luar Kabupaten",
          school.siswaLanjutLuarKab,
          options.luarKab
        )}
        <div>
          <h4 className="text-card-foreground mb-3 font-medium">
            Tidak Melanjutkan / Bekerja
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">
                {school.siswaTidakLanjut || 0}
              </p>
              <p className="text-xs text-red-600">Tidak Melanjutkan</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {school.siswaBekerja || 0}
              </p>
              <p className="text-xs text-green-600">Bekerja</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeachersInfo = () => {
    // ✅ PATCH: pakai guruNormalized (bukan school.guru doang)
    const guru = guruNormalized || {};
    const guruData = [
      { label: "Jumlah Guru", value: guru.jumlahGuru },
      { label: "PNS", value: guru.pns },
      { label: "PPPK", value: guru.pppk },
      { label: "PPPK Paruh Waktu", value: guru.pppkParuhWaktu },
      { label: "Non ASN (Dapodik)", value: guru.nonAsnDapodik },
      { label: "Non ASN (Non-Dapodik)", value: guru.nonAsnTidakDapodik },
      { label: "Kekurangan Guru", value: guru.kekuranganGuru, highlight: true },
    ];
    return (
      <div>
        <h4 className="text-card-foreground mb-3 flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Rincian Data Guru
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {guruData.map((item) => (
            <div
              key={item.label}
              className={`bg-card border p-4 rounded-lg text-center ${
                item.highlight && (item.value || 0) > 0
                  ? "bg-red-50 border-red-200"
                  : ""
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  item.highlight && (item.value || 0) > 0
                    ? "text-red-600"
                    : "text-card-foreground"
                }`}
              >
                {item.value ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFacilitiesInfo = () => {
    // --- BARU ---
    // Ambil data kegiatan fisik dari prop 'school'
    const kegiatan = school.kegiatanFisik || {};

    const RoomCard = ({ item }) => {
      const data = item.data || {};
      const total =
        data.total_all || data.total_room || data.total || data.jumlah || 0;
      const good = data.good || data.baik || 0;
      const moderate_damage = data.moderate_damage || data.rusakSedang || 0;
      const heavy_damage = data.heavy_damage || data.rusakBerat || 0;

      return (
        <div className="bg-gray-50 border p-3 rounded-lg flex items-start gap-4">
          <div>{item.icon}</div>
          <div className="flex-1">
            <h5 className="font-semibold text-sm mb-1">{item.title}</h5>
            <div className="text-xs space-y-1 text-gray-600">
              <p>
                Total:{" "}
                <span className="font-medium text-gray-800">{total}</span>
              </p>
              {good > 0 || total > 0 ? (
                <>
                  <p>
                    Baik:{" "}
                    <span className="font-medium text-green-700">{good}</span>
                  </p>
                  <p>
                    Rusak Sedang:{" "}
                    <span className="font-medium text-yellow-700">
                      {moderate_damage}
                    </span>
                  </p>
                  <p>
                    Rusak Berat:{" "}
                    <span className="font-medium text-red-700">
                      {heavy_damage}
                    </span>
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      );
    };

    if (isSmp) {
      const prasarana = school;

      const labs = [
        {
          title: "Lab. Komputer",
          data: prasarana.laboratory_comp,
          icon: <Computer className="h-5 w-5 text-blue-600" />,
        },
        {
          title: "Lab. Bahasa",
          data: prasarana.laboratory_langua,
          icon: <Languages className="h-5 w-5 text-green-600" />,
        },
        {
          title: "Lab. IPA",
          data: prasarana.laboratory_ipa,
          icon: <FlaskConical className="h-5 w-5 text-purple-600" />,
        },
        {
          title: "Lab. Fisika",
          data: prasarana.laboratory_fisika,
          icon: <FlaskConical className="h-5 w-5 text-indigo-600" />,
        },
        {
          title: "Lab. Biologi",
          data: prasarana.laboratory_biologi,
          icon: <FlaskConical className="h-5 w-5 text-teal-600" />,
        },
      ].filter((lab) => lab.data && (lab.data.total_all || lab.data.jumlah));

      const supportRooms = [
        {
          title: "Perpustakaan",
          data: prasarana.library,
          icon: <Library className="h-5 w-5 text-orange-600" />,
        },
        {
          title: "Ruang Kepsek",
          data: prasarana.kepsek_room,
          icon: <PersonStanding className="h-5 w-5 text-gray-600" />,
        },
        {
          title: "Ruang Guru",
          data: prasarana.teacher_room,
          icon: <Users className="h-5 w-5 text-cyan-600" />,
        },
        {
          title: "Ruang TU",
          data: prasarana.administration_room,
          icon: <Briefcase className="h-5 w-5 text-pink-600" />,
        },
        {
          title: "UKS",
          data: prasarana.uks_room,
          icon: <HeartPulse className="h-5 w-5 text-red-600" />,
        },
        {
          title: "Rumah Dinas",
          data: prasarana.official_residences || prasarana.rumahDinas,
          icon: <Building className="h-5 w-5 text-gray-600" />,
        },
      ].filter(
        (room) => room.data && (room.data.total_all || room.data.jumlah)
      );

      const furniture =
        prasarana.furniture_computer || prasarana.mebeulair || {};

      const classCondition =
        prasarana.class_condition || prasarana.ruangKelas || {};
      const classTotal =
        classCondition.total_room || classCondition.jumlah || 0;
      const classGood =
        classCondition.classrooms_good || classCondition.baik || 0;
      const classModerate =
        classCondition.classrooms_moderate_damage ||
        classCondition.rusakSedang ||
        0;
      const classHeavy =
        classCondition.classrooms_heavy_damage ||
        classCondition.rusakBerat ||
        0;

      const hasToilets = prasarana.teachers_toilet || prasarana.students_toilet;

      return (
        <div className="space-y-6">
          {classTotal > 0 && (
            <div>
              <h4 className="text-card-foreground mb-3">Kondisi Ruang Kelas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {classTotal}
                  </p>
                  <p className="text-xs text-gray-600">Total Ruang</p>
                </div>
                <div className="bg-green-50 border-green-200 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {classGood}
                  </p>
                  <p className="text-xs text-green-600">Kondisi Baik</p>
                </div>
                <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">
                    {classModerate}
                  </p>
                  <p className="text-xs text-yellow-600">Rusak Sedang</p>
                </div>
                <div className="bg-red-50 border-red-200 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {classHeavy}
                  </p>
                  <p className="text-xs text-red-600">Rusak Berat</p>
                </div>
              </div>
            </div>
          )}

          {labs.length > 0 && (
            <div>
              <h4 className="text-card-foreground mb-3">Laboratorium</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labs.map((lab) => (
                  <RoomCard key={lab.title} item={lab} />
                ))}
              </div>
            </div>
          )}

          {supportRooms.length > 0 && (
            <div>
              <h4 className="text-card-foreground mb-3">
                Ruangan Penunjang Lainnya
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportRooms.map((room) => (
                  <RoomCard key={room.title} item={room} />
                ))}
              </div>
            </div>
          )}

          {hasToilets && (
            <div>
              <h4 className="text-card-foreground mb-3">Rincian Toilet</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RoomCard
                  item={{
                    title: "Toilet Guru (Pria)",
                    data: prasarana.teachers_toilet?.male,
                    icon: <Users className="h-5 w-5" />,
                  }}
                />
                <RoomCard
                  item={{
                    title: "Toilet Guru (Wanita)",
                    data: prasarana.teachers_toilet?.female,
                    icon: <Users className="h-5 w-5" />,
                  }}
                />
                <RoomCard
                  item={{
                    title: "Toilet Siswa (Pria)",
                    data: prasarana.students_toilet?.male,
                    icon: <Users className="h-5 w-5" />,
                  }}
                />
                <RoomCard
                  item={{
                    title: "Toilet Siswa (Wanita)",
                    data: prasarana.students_toilet?.female,
                    icon: <Users className="h-5 w-5" />,
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-card-foreground mb-3 flex items-center gap-2">
                <Armchair className="h-4 w-4" /> Mebeulair
              </h4>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="font-semibold text-sm mb-2">Meja</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-bold text-lg">
                        {furniture.tables || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Jumlah</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-600">
                        {furniture.good || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Baik</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-600">
                        {(furniture.moderate_damage || 0) +
                          (furniture.heavy_damage || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Rusak</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="font-semibold text-sm mb-2">Kursi</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-bold text-lg">
                        {furniture.chairs || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Jumlah</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-600">
                        {furniture.good || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Baik</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-600">
                        {(furniture.moderate_damage || 0) +
                          (furniture.heavy_damage || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Rusak</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-card-foreground mb-3 flex items-center gap-2">
                <Laptop className="h-4 w-4" /> Lainnya
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 border h-full flex flex-col justify-center">
                <p className="text-2xl font-bold text-center">
                  {furniture.computer || 0}
                </p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Jumlah Komputer
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback PAUD / PKBM / SD
    const prasarana = school.prasarana || {};
    const ruangKelas = prasarana.classrooms || prasarana.ruangKelas || {};
    const ruanganLainnya = [
      {
        title: "Perpustakaan",
        data: prasarana.library || prasarana.ruangPerpustakaan,
      },
      {
        title: "Laboratorium",
        data: prasarana.laboratory || prasarana.ruangLaboratorium,
      },
      {
        title: "Ruang Guru",
        data: prasarana.teacher_room || prasarana.ruangGuru,
      },
      { title: "UKS", data: prasarana.uks_room || prasarana.ruangUks },
      { title: "Toilet", data: prasarana.toilets || prasarana.toiletGuruSiswa },
      {
        title: "Rumah Dinas",
        data: prasarana.official_residences || prasarana.rumahDinas,
      },
    ];
    const mejaData =
      prasarana.furniture?.tables || prasarana.mebeulair?.tables || {};
    const kursiData =
      prasarana.furniture?.chairs || prasarana.mebeulair?.chairs || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center border">
            <p className="text-xl font-bold text-gray-800">
              {prasarana.ukuran?.tanah || 0}
              <span className="text-sm font-normal"> m²</span>
            </p>
            <p className="text-xs text-gray-500">Luas Tanah</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center border">
            <p className="text-xl font-bold text-gray-800">
              {prasarana.ukuran?.bangunan || 0}
              <span className="text-sm font-normal"> m²</span>
            </p>
            <p className="text-xs text-gray-500">Luas Bangunan</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center border">
            <p className="text-xl font-bold text-gray-800">
              {prasarana.ukuran?.halaman || 0}
              <span className="text-sm font-normal"> m²</span>
            </p>
            <p className="text-xs text-gray-500">Luas Halaman</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center border">
            <p className="text-xl font-bold text-gray-800">
              {prasarana.gedung?.jumlah || 0}
            </p>
            <p className="text-xs text-gray-500">Jumlah Gedung</p>
          </div>
        </div>
        <div>
          <h4 className="text-card-foreground mb-3">
            Detail Kondisi Ruang Kelas
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Baik
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    R. Ringan
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    R. Sedang
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    R. Berat
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    R. Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 text-sm text-center font-bold">
                    {ruangKelas.total_room || ruangKelas.jumlah || 0}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-green-600">
                    {ruangKelas.classrooms_good || ruangKelas.baik || 0}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-yellow-600">
                    {ruangKelas.rusakRingan || 0}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-orange-600">
                    {ruangKelas.classrooms_moderate_damage ||
                      ruangKelas.rusakSedang ||
                      0}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-red-600">
                    {ruangKelas.heavy_damage || ruangKelas.rusakBerat || 0}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-red-800">
                    {ruangKelas.rusakTotal || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 className="text-card-foreground mb-3">
            Detail Tambahan Ruang Kelas
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border-red-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-red-700">
                {ruangKelas.kurangRkb || 0}
              </p>
              <p className="text-xs text-red-600">Kurang RKB</p>
            </div>
            <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-yellow-700">
                {ruangKelas.kelebihan || 0}
              </p>
              <p className="text-xs text-yellow-600">Kelebihan (Tak Terawat)</p>
            </div>
            <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-blue-700">
                {ruangKelas.rkbTambahan || 0}
              </p>
              <p className="text-xs text-blue-600">RKB Tambahan</p>
            </div>
            <div className="bg-gray-100 border rounded-lg p-4 text-center flex flex-col justify-center">
              <p className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
                <Layers className="h-4 w-4" />
                <span>{ruangKelas.lahan || "-"}</span>
              </p>
              <p className="text-xs text-gray-600">Ketersediaan Lahan</p>
            </div>
          </div>
        </div>

        {/* --- BLOK BARU --- */}
        <div>
          <h4 className="text-card-foreground mb-3">
            Rencana Kegiatan Fisik (DAK)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-blue-700">
                {kegiatan.rehabRuangKelas || 0}
              </p>
              <p className="text-xs text-blue-600">Rehab Ruang Kelas</p>
            </div>
            <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-blue-700">
                {kegiatan.pembangunanRKB || 0}
              </p>
              <p className="text-xs text-blue-600">Pembangunan RKB</p>
            </div>
            <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-blue-700">
                {kegiatan.rehabToilet || 0}
              </p>
              <p className="text-xs text-blue-600">Rehab Toilet</p>
            </div>
            <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-blue-700">
                {kegiatan.pembangunanToilet || 0}
              </p>
              <p className="text-xs text-blue-600">Pembangunan Toilet</p>
            </div>
          </div>
        </div>
        {/* --- SELESAI BLOK BARU --- */}

        <div>
          <h4 className="text-card-foreground mb-3">Kondisi Ruangan Lainnya</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Jenis Ruang
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Baik
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Rusak Sedang
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Rusak Berat
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  {
                    title: "Perpustakaan",
                    data: prasarana.library || prasarana.ruangPerpustakaan,
                  },
                  {
                    title: "Laboratorium",
                    data: prasarana.laboratory || prasarana.ruangLaboratorium,
                  },
                  {
                    title: "Ruang Guru",
                    data: prasarana.ruangGuru || prasarana.ruangGuru,
                  },
                  {
                    title: "UKS",
                    data: prasarana.uks_room || prasarana.ruangUks,
                  },
                  {
                    title: "Toilet",
                    data: prasarana.toilets || prasarana.toiletGuruSiswa,
                  },
                  {
                    title: "Rumah Dinas",
                    data: prasarana.official_residences || prasarana.rumahDinas,
                  },
                ].map((item) => {
                  const data = item.data || {};
                  const total = data.total || data.jumlah || 0;
                  return (
                    <tr key={item.title}>
                      <td className="px-4 py-2 text-sm font-medium">
                        {item.title}
                      </td>
                      <td className="px-4 py-2 text-sm text-center font-bold">
                        {total}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-green-600">
                        {data.good || data.baik || 0}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-orange-600">
                        {data.moderate_damage || data.rusakSedang || 0}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-red-600">
                        {data.heavy_damage || data.rusakBerat || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-card-foreground mb-3 flex items-center gap-2">
              <Armchair className="h-4 w-4" /> Mebeulair
            </h4>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="font-semibold text-sm mb-2">Meja</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-bold text-lg">
                      {mejaData.total || mejaData.jumlah || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Jumlah</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-green-600">
                      {mejaData.good || mejaData.baik || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Baik</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-red-600">
                      {(mejaData.moderate_damage || 0) +
                        (mejaData.heavy_damage || 0) ||
                        mejaData.rusak ||
                        0}
                    </p>
                    <p className="text-xs text-muted-foreground">Rusak</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="font-semibold text-sm mb-2">Kursi</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-bold text-lg">
                      {kursiData.total || kursiData.jumlah || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Jumlah</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-green-600">
                      {kursiData.good || kursiData.baik || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Baik</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-red-600">
                      {(kursiData.moderate_damage || 0) +
                        (kursiData.heavy_damage || 0) ||
                        kursiData.rusak ||
                        0}
                    </p>
                    <p className="text-xs text-muted-foreground">Rusak</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-card-foreground mb-3 flex items-center gap-2">
              <Laptop className="h-4 w-4" /> Lainnya
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 border h-full flex flex-col justify-center">
              <p className="text-2xl font-bold text-center">
                {school.chromebook || 0}
              </p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Jumlah Chromebook
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInstitutionalInfo = () => {
    const data = school.kelembagaan || {};
    const renderInfoItem = (label, value) => (
      <div className="flex justify-between items-center py-2 border-b last:border-b-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-card-foreground text-right">
          {value || "-"}
        </span>
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-card-foreground mb-3 font-medium">
            Status Kelembagaan
          </h4>
          <div className="p-4 border rounded-lg bg-gray-50/70">
            {renderInfoItem(
              "Peralatan Rumah Tangga",
              data.peralatanRumahTangga
            )}
            {renderInfoItem("Pembinaan", data.pembinaan)}
            {renderInfoItem("Asesmen", data.asesmen)}
            {renderInfoItem(
              "Menyelenggarakan Belajar",
              data.menyelenggarakanBelajar
            )}
            {renderInfoItem(
              "Melaksanakan Rekomendasi",
              data.melaksanakanRekomendasi
            )}
            {renderInfoItem("Siap Dievaluasi", data.siapDievaluasi)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-card-foreground mb-3 font-medium">BOP</h4>
            <div className="p-4 border rounded-lg bg-gray-50/70">
              {renderInfoItem("Pengelola", data.bop?.pengelola)}
              {renderInfoItem(
                "Tenaga Ditingkatkan",
                data.bop?.tenagaPeningkatan
              )}
            </div>
          </div>
          <div>
            <h4 className="text-card-foreground mb-3 font-medium">Perizinan</h4>
            <div className="p-4 border rounded-lg bg-gray-50/70">
              {renderInfoItem("Pengendalian", data.perizinan?.pengendalian)}
              {renderInfoItem("Kelayakan", data.perizinan?.kelayakan)}
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-card-foreground mb-3 font-medium">Kurikulum</h4>
          <div className="p-4 border rounded-lg bg-gray-50/70">
            {renderInfoItem("Silabus", data.kurikulum?.silabus)}
            {renderInfoItem(
              "Kompetensi Dasar",
              data.kurikulum?.kompetensiDasar
            )}
          </div>
        </div>
      </div>
    );
  };

  // ====== RENDER ======
  return (
    <div className="space-y-6">
      {/* NAV TAB (custom, sama seperti modal) */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex space-x-4 overflow-x-auto"
          aria-label="Tabs"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`${
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* KONTEN TAB */}
      <div className="p-1">
        {
          {
            basic: renderBasicInfo(),
            students: renderStudentsInfo(),
            graduation: renderGraduationInfo(),
            teachers: renderTeachersInfo(),
            facilities: renderFacilitiesInfo(),
            institutional: renderInstitutionalInfo(),
          }[activeTab]
        }
      </div>
    </div>
  );
}
