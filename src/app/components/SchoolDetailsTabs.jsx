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
  Bath,
} from "lucide-react";

// =========================
// ✅ HELPERS
// =========================
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeParseJson = (v) => {
  if (v == null) return v;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const pick = (school, key, fallback = undefined) => {
  if (!school) return fallback;
  const direct = school[key];
  if (direct !== undefined && direct !== null) return direct;
  const metaRaw = school.meta;
  const meta = safeParseJson(metaRaw);
  if (
    meta &&
    typeof meta === "object" &&
    meta[key] !== undefined &&
    meta[key] !== null
  ) {
    return meta[key];
  }
  return fallback;
};

const pickMetaPath = (school, path, fallback = undefined) => {
  if (!school) return fallback;
  const meta = safeParseJson(school.meta);
  if (!meta || typeof meta !== "object") return fallback;
  const val = path.split(".").reduce((o, k) => (o ? o[k] : undefined), meta);
  return val === undefined || val === null ? fallback : val;
};

// =========================
// ✅ MERGE PRASARANA
// =========================
const isPlainObject = (x) => x && typeof x === "object" && !Array.isArray(x);

const pickBetterNumber = (a, b) => {
  const an = Number(a);
  const bn = Number(b);
  const aOk = Number.isFinite(an) && an > 0;
  const bOk = Number.isFinite(bn) && bn > 0;
  if (aOk && bOk) return Math.max(an, bn);
  if (aOk) return an;
  if (bOk) return bn;
  if (Number.isFinite(an)) return an;
  if (Number.isFinite(bn)) return bn;
  return 0;
};

const mergeFacilityObject = (base, extra) => {
  if (!isPlainObject(base) && !isPlainObject(extra))
    return base ?? extra ?? null;
  if (!isPlainObject(base)) return extra;
  if (!isPlainObject(extra)) return base;

  const out = { ...base, ...extra };
  const numberKeys = [
    "total",
    "jumlah",
    "total_all",
    "total_room",
    "good",
    "baik",
    "moderate_damage",
    "rusakSedang",
    "heavy_damage",
    "rusakBerat",
    "classrooms_good",
    "classrooms_moderate_damage",
    "classrooms_heavy_damage",
    "kurangRkb",
    "kurang_rkb",
    "kelebihan",
    "rkbTambahan",
    "rkb_tambahan",
  ];
  numberKeys.forEach((k) => {
    if (k in base || k in extra)
      out[k] = pickBetterNumber(base?.[k], extra?.[k]);
  });
  Object.keys(out).forEach((k) => {
    if (isPlainObject(base?.[k]) && isPlainObject(extra?.[k])) {
      out[k] = mergeFacilityObject(base[k], extra[k]);
    }
  });
  return out;
};

const mergePrasarana = (...sources) => {
  const objs = sources.filter((s) => isPlainObject(s));
  if (objs.length === 0) return null;

  const out = {};
  const keys = new Set();
  objs.forEach((o) => Object.keys(o).forEach((k) => keys.add(k)));

  keys.forEach((k) => {
    const vals = objs.map((o) => o[k]).filter((v) => typeof v !== "undefined");
    if (vals.length === 0) return;

    if (vals.every((v) => isPlainObject(v))) {
      const facilityStyle = vals.some(
        (v) =>
          "total" in v ||
          "jumlah" in v ||
          "total_all" in v ||
          "total_room" in v ||
          "good" in v ||
          "moderate_damage" in v ||
          "heavy_damage" in v
      );

      if (facilityStyle) {
        let acc = vals[0];
        for (let i = 1; i < vals.length; i++)
          acc = mergeFacilityObject(acc, vals[i]);
        out[k] = acc;
      } else {
        let acc = { ...vals[0] };
        for (let i = 1; i < vals.length; i++) {
          const next = vals[i];
          Object.keys(next).forEach((sk) => {
            if (typeof acc[sk] === "undefined") acc[sk] = next[sk];
            else if (
              (typeof acc[sk] === "number" || typeof next[sk] === "number") &&
              (Number.isFinite(Number(acc[sk])) ||
                Number.isFinite(Number(next[sk])))
            ) {
              acc[sk] = pickBetterNumber(acc[sk], next[sk]);
            } else if (isPlainObject(acc[sk]) && isPlainObject(next[sk])) {
              acc[sk] = mergePrasarana(acc[sk], next[sk]) ?? acc[sk];
            }
          });
        }
        out[k] = acc;
      }
      return;
    }

    const hasNumeric =
      vals.some((v) => Number.isFinite(Number(v))) &&
      vals.every((v) => typeof v !== "object");
    if (hasNumeric) {
      let acc = vals[0];
      for (let i = 1; i < vals.length; i++)
        acc = pickBetterNumber(acc, vals[i]);
      out[k] = acc;
      return;
    }

    out[k] = vals.find((v) => v !== null && v !== "") ?? vals[0];
  });

  return out;
};

function normalizeSchoolFromMeta(school) {
  if (!school) return school;

  const meta = safeParseJson(school.meta);
  const metaObj = meta && typeof meta === "object" ? meta : null;

  const prasaranaCandidateRaw =
    school.prasarana_json ??
    school.prasaranaJson ??
    school.prasaranaJsonb ??
    metaObj?.prasarana ??
    metaObj?.prasarana_json ??
    metaObj?.prasaranaJson;

  const prasaranaCandidate = safeParseJson(prasaranaCandidateRaw);
  const prasaranaFromAny =
    prasaranaCandidate && typeof prasaranaCandidate === "object"
      ? prasaranaCandidate
      : metaObj?.prasarana && typeof metaObj.prasarana === "object"
      ? metaObj.prasarana
      : null;

  const isMeaningfulPrasarana = (p) => {
    if (!p || typeof p !== "object") return false;
    const tanah = toNum(p.ukuran?.tanah);
    const bangunan = toNum(p.ukuran?.bangunan);
    const halaman = toNum(p.ukuran?.halaman);
    const gedung = toNum(p.gedung?.jumlah);
    const chromebook = toNum(p.chromebook);
    const ruangKelasTotal =
      toNum(p.classrooms?.total_room) ||
      toNum(p.classrooms?.jumlah) ||
      toNum(p.ruangKelas?.total_room) ||
      toNum(p.ruangKelas?.jumlah);

    const labScore =
      toNum(
        p.laboratory_comp?.total_all ??
          p.laboratory_comp?.total_room ??
          p.laboratory_comp?.total ??
          p.laboratory_comp?.jumlah
      ) +
      toNum(
        p.laboratory_langua?.total_all ??
          p.laboratory_langua?.total_room ??
          p.laboratory_langua?.total ??
          p.laboratory_langua?.jumlah
      ) +
      toNum(
        p.laboratory_ipa?.total_all ??
          p.laboratory_ipa?.total_room ??
          p.laboratory_ipa?.total ??
          p.laboratory_ipa?.jumlah
      ) +
      toNum(
        p.laboratory_fisika?.total_all ??
          p.laboratory_fisika?.total_room ??
          p.laboratory_fisika?.total ??
          p.laboratory_fisika?.jumlah
      ) +
      toNum(
        p.laboratory_biologi?.total_all ??
          p.laboratory_biologi?.total_room ??
          p.laboratory_biologi?.total ??
          p.laboratory_biologi?.jumlah
      );

    const score =
      tanah +
      bangunan +
      halaman +
      gedung +
      chromebook +
      ruangKelasTotal +
      labScore;
    if (score > 0) return true;

    const rooms = [
      p.library,
      p.toilets,
      p.uks_room,
      p.teacher_room,
      p.laboratory,
      p.official_residences,
      p.ruangPerpustakaan,
      p.toiletGuruSiswa,
      p.ruangUks,
      p.ruangGuru,
      p.ruangLaboratorium,
      p.rumahDinas,
    ].filter(Boolean);

    return rooms.some(
      (r) => toNum(r.total) > 0 || toNum(r.jumlah) > 0 || toNum(r.total_all) > 0
    );
  };

  const prasaranaBest = isMeaningfulPrasarana(school.prasarana)
    ? school.prasarana
    : isMeaningfulPrasarana(prasaranaFromAny)
    ? prasaranaFromAny
    : school.prasarana ?? prasaranaFromAny;

  const flatLuasTanah = school.luas_tanah ?? school.luasTanah;
  const flatLuasBangunan = school.luas_bangunan ?? school.luasBangunan;
  const flatLuasHalaman = school.luas_halaman ?? school.luasHalaman;
  const flatJumlahGedung = school.jumlah_gedung ?? school.jumlahGedung;
  const flatChromebook = school.chromebook;

  const hasFlatPrasarana =
    flatLuasTanah != null ||
    flatLuasBangunan != null ||
    flatLuasHalaman != null ||
    flatJumlahGedung != null ||
    flatChromebook != null;

  const prasaranaFromFlat =
    !isMeaningfulPrasarana(prasaranaBest) && hasFlatPrasarana
      ? {
          ukuran: {
            tanah: toNum(flatLuasTanah),
            bangunan: toNum(flatLuasBangunan),
            halaman: toNum(flatLuasHalaman),
          },
          gedung: { jumlah: toNum(flatJumlahGedung) },
          chromebook: toNum(flatChromebook),
        }
      : null;

  const isMeaningfulKegiatanFisik = (k) => {
    if (!k || typeof k !== "object") return false;
    return (
      toNum(k.rehabRuangKelas) > 0 ||
      toNum(k.pembangunanRKB) > 0 ||
      toNum(k.rehabToilet) > 0 ||
      toNum(k.pembangunanToilet) > 0
    );
  };

  const kegiatanFromRpc = safeParseJson(
    school.kegiatanFisik ??
      school.kegiatan_fisik ??
      school.kegiatan_fisik_json ??
      school.kegiatanFisikJson
  );

  const kegiatanFromMeta = safeParseJson(
    metaObj?.kegiatanFisik ?? metaObj?.kegiatan_fisik
  );

  const kegiatanBest = isMeaningfulKegiatanFisik(kegiatanFromRpc)
    ? kegiatanFromRpc
    : isMeaningfulKegiatanFisik(kegiatanFromMeta)
    ? kegiatanFromMeta
    : kegiatanFromRpc ?? kegiatanFromMeta ?? {};

  const prasaranaMerged =
    mergePrasarana(prasaranaBest, prasaranaFromAny, prasaranaFromFlat) ??
    prasaranaBest ??
    prasaranaFromAny ??
    prasaranaFromFlat;

  const promoteSmpFields = (obj) => {
    const m = metaObj || {};
    const keys = [
      "class_condition",
      "library",
      "laboratory_comp",
      "laboratory_langua",
      "laboratory_ipa",
      "laboratory_fisika",
      "laboratory_biologi",
      "kepsek_room",
      "teacher_room",
      "administration_room",
      "uks_room",
      "teachers_toilet",
      "students_toilet",
      "official_residences",
      "furniture_computer",
      "mebeulair",
    ];
    const out = { ...obj };
    keys.forEach((k) => {
      if (out[k] == null && m[k] != null) out[k] = m[k];
    });
    return out;
  };

  const normalizeComputerCount = (pras) => {
    if (!pras || typeof pras !== "object") return pras;
    const out = { ...pras };
    const furniture = isPlainObject(out.furniture) ? { ...out.furniture } : {};
    const mebeulair = isPlainObject(out.mebeulair) ? out.mebeulair : null;

    const computerFromFurniture = furniture?.computer;
    const computerFromMebeulair = mebeulair?.computer;
    const bestComputer = pickBetterNumber(
      computerFromFurniture,
      computerFromMebeulair
    );

    out.furniture = { ...furniture, computer: bestComputer };
    if (mebeulair && typeof mebeulair === "object") {
      out.mebeulair = {
        ...mebeulair,
        computer: pickBetterNumber(mebeulair.computer, bestComputer),
      };
    }
    return out;
  };

  // ✅ PERBAIKAN LOGIKA KELEMBAGAAN (MANUAL MERGE ANTI-GAGAL)
  const rootKel = school.kelembagaan || {};
  const metaKel = metaObj?.kelembagaan || {};

  // Fungsi: Cek root dulu, kalau null/undefined baru ambil meta
  const resolve = (key) => rootKel[key] ?? metaKel[key];
  const resolveDeep = (key, subKey) =>
    rootKel[key]?.[subKey] ?? metaKel[key]?.[subKey];

  const kelembagaanFinal = {
    peralatanRumahTangga: resolve("peralatanRumahTangga"),
    pembinaan: resolve("pembinaan"),
    asesmen: resolve("asesmen"),
    menyelenggarakanBelajar: resolve("menyelenggarakanBelajar"),
    melaksanakanRekomendasi: resolve("melaksanakanRekomendasi"),
    siapDievaluasi: resolve("siapDievaluasi"),
    bop: {
      pengelola: resolveDeep("bop", "pengelola"),
      tenagaPeningkatan: resolveDeep("bop", "tenagaPeningkatan"),
    },
    perizinan: {
      pengendalian: resolveDeep("perizinan", "pengendalian"),
      kelayakan: resolveDeep("perizinan", "kelayakan"),
    },
    kurikulum: {
      silabus: resolveDeep("kurikulum", "silabus"),
      kompetensiDasar: resolveDeep("kurikulum", "kompetensiDasar"),
    },
  };

  let normalized = {
    ...school,
    jenjang: school.jenjang ?? metaObj?.jenjang,
    kecamatan: school.kecamatan ?? metaObj?.kecamatan,
    desa: school.desa ?? metaObj?.desa,
    alamat: school.alamat ?? metaObj?.alamat,
    prasarana: normalizeComputerCount(prasaranaMerged),
    kegiatanFisik: kegiatanBest,
    kelembagaan: kelembagaanFinal, // Gunakan hasil manual merge
    rombel: school.rombel ?? metaObj?.rombel,
    guru: school.guru ?? metaObj?.guru,
    chromebook:
      school.chromebook ??
      prasaranaMerged?.chromebook ??
      metaObj?.chromebook ??
      school.chromebook,
  };

  normalized = promoteSmpFields(normalized);
  return normalized;
}

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

  const coerceObj = (raw) => {
    const parsed = safeParseJson(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
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

  const schoolGuru = coerceObj(school.guru);
  const metaGuru = coerceObj(pickMetaPath(school, "guru", null));

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

  const pickBestGuruSource = () => {
    if (schoolGuru && schoolBreakdown > 0) return schoolGuru;
    if (metaGuru && metaBreakdown > 0) return metaGuru;
    if (staffGuru && staffBreakdown > 0) return staffGuru;
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

// --- KONSTANTA ---
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
    paketA: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "paketB", label: "Lanjut Paket B" },
    ],
    paketB: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
      { key: "paketC", label: "Lanjut Paket C" },
    ],
    paketC: [
      { key: "pt", label: "Perguruan Tinggi" },
      { key: "bekerja", label: "Bekerja" },
    ],
  },
};
LANJUT_OPTIONS.TK = LANJUT_OPTIONS.PAUD;

export default function SchoolDetailsTabs({ school }) {
  const [activeTab, setActiveTab] = useState("basic");
  if (!school)
    return <div className="p-6 text-muted-foreground">Memuat data…</div>;

  const schoolN = normalizeSchoolFromMeta(school);
  const schoolTypeRaw = schoolN.schoolType || schoolN.jenjang;
  const schoolType =
    typeof schoolTypeRaw === "string"
      ? schoolTypeRaw.trim().toUpperCase()
      : schoolTypeRaw;

  const isSd = schoolType === "SD";
  const isSmp = schoolType === "SMP";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";
  const isPkbm = schoolType === "PKBM";

  const guruNormalized = normalizeGuruFromSchool(schoolN);

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

  const getTotalAbk = () => sumNestedObject(schoolN.siswaAbk);

  const getTotalFacilities = () => {
    let total = 0;
    const prasarana = schoolN.prasarana || {};

    if (isSmp) {
      const facilities = [
        schoolN.class_condition,
        schoolN.library,
        schoolN.laboratory_comp,
        schoolN.laboratory_langua,
        schoolN.laboratory_ipa,
        schoolN.laboratory_fisika,
        schoolN.laboratory_biologi,
        schoolN.kepsek_room,
        schoolN.teacher_room,
        schoolN.administration_room,
        schoolN.uks_room,
        // toilet dihitung dari split data jika ada
        schoolN.teachers_toilet,
        schoolN.students_toilet,
        // fallback jika toilet masih gabungan
        schoolN.toilets,
      ];
      facilities.forEach((facility) => {
        if (facility) {
          if (typeof facility.total_room !== "undefined")
            total += Number(facility.total_room);
          if (typeof facility.total_all !== "undefined")
            total += Number(facility.total_all);
          if (typeof facility.total !== "undefined")
            total += Number(facility.total);
          // handle split gender (male/female)
          if (facility.male) total += Number(facility.male.total || 0);
          if (facility.female) total += Number(facility.female.total || 0);
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
        prasarana.library,
        prasarana.laboratory,
        prasarana.teacher_room,
        prasarana.uks_room,
        prasarana.toilets,
        prasarana.official_residences,
      ];

      facilities.forEach((facility) => {
        if (!facility) return;
        if (typeof facility.total_room !== "undefined") {
          total += Number(facility.total_room) || 0;
          return;
        }
        const jumlah =
          facility.total || facility.jumlah || facility.total_all || 0;
        total += Number(jumlah) || 0;
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

  // ======== BASIC =========
  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-card-foreground mb-1">
              {schoolN.name || schoolN.namaSekolah}
            </h3>
            <p className="text-primary font-mono text-sm">{schoolN.npsn}</p>
          </div>
          <Badge
            className={`rounded-full ${getStatusColor(schoolN.dataStatus)}`}
          >
            {schoolN.dataStatus || "Aktif"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Kec. {schoolN.kecamatan || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>
              {schoolType} - {schoolN.type || schoolN.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Update:{" "}
              {schoolN.lastUpdated || new Date().toLocaleDateString("id-ID")}
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
              {schoolN.student_count || schoolN.siswa?.jumlahSiswa || 0}
            </p>
            <p className="text-xs text-blue-600">Total Siswa</p>
          </div>

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

  // ======== STUDENTS =========
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
          schoolN.siswa?.[`kelas${k}`],
          schoolN.rombel?.[`kelas${k}`],
          schoolN.siswaAbk?.[`kelas${k}`]
        )
      );

    if (isSmp)
      return renderStudentTable("Siswa per Kelas", [7, 8, 9], (k) =>
        renderRow(
          `Kelas ${k}`,
          schoolN.siswa?.[`kelas${k}`],
          schoolN.rombel?.[`kelas${k}`],
          schoolN.siswaAbk?.[`kelas${k}`]
        )
      );

    if (isPaud)
      return renderStudentTable(
        "Siswa per Kelompok",
        PAUD_ROMBEL_TYPES,
        (type) =>
          renderRow(
            type.label,
            schoolN.siswa?.[type.key],
            schoolN.rombel?.[type.key],
            schoolN.siswaAbk?.[type.key]
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
                          schoolN.siswa?.[`paket${key}`]?.[`kelas${k}`],
                          schoolN.rombel?.[`paket${key}`]?.[`kelas${k}`],
                          schoolN.siswaAbk?.[`paket${key}`]?.[`kelas${k}`]
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

  // ======== GRADUATION =========
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
      // ✅ Ambil Data Paket A
      const lulusanPaketA = pick(schoolN, "lulusanPaketA", null);
      const lulusanPaketB = pick(schoolN, "lulusanPaketB", null);
      const lulusanPaketC = pick(schoolN, "lulusanPaketC", null);

      return (
        <div className="space-y-6">
          {/* ✅ Render Tabel Paket A */}
          {renderDataTable(
            "Kelanjutan Lulusan Paket A",
            lulusanPaketA,
            options.paketA
          )}
          {renderDataTable(
            "Kelanjutan Lulusan Paket B",
            lulusanPaketB,
            options.paketB
          )}
          {renderDataTable(
            "Kelanjutan Lulusan Paket C",
            lulusanPaketC,
            options.paketC
          )}
        </div>
      );
    }

    const siswaLanjutDalamKab = pick(schoolN, "siswaLanjutDalamKab", null);
    const siswaLanjutLuarKab = pick(schoolN, "siswaLanjutLuarKab", null);
    const siswaTidakLanjut = pick(schoolN, "siswaTidakLanjut", 0);
    const siswaBekerja = pick(schoolN, "siswaBekerja", 0);

    return (
      <div className="space-y-6">
        {renderDataTable(
          "Melanjutkan Dalam Kabupaten",
          siswaLanjutDalamKab,
          options.dalamKab
        )}
        {renderDataTable(
          "Melanjutkan Luar Kabupaten",
          siswaLanjutLuarKab,
          options.luarKab
        )}
        <div>
          <h4 className="text-card-foreground mb-3 font-medium">
            Tidak Melanjutkan / Bekerja
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">
                {siswaTidakLanjut || 0}
              </p>
              <p className="text-xs text-red-600">Tidak Melanjutkan</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {siswaBekerja || 0}
              </p>
              <p className="text-xs text-green-600">Bekerja</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ======== TEACHERS =========
  const renderTeachersInfo = () => {
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

  // ======== FACILITIES =========
  const renderFacilitiesInfo = () => {
    const kegiatan = schoolN.kegiatanFisik || {};
    const prasarana = schoolN.prasarana || {};

    const RoomCard = ({ item }) => {
      const dataRaw = item.data;
      const data =
        dataRaw && typeof dataRaw === "string"
          ? safeParseJson(dataRaw)
          : dataRaw;
      const obj = data && typeof data === "object" ? data : {};

      const total =
        obj.total_all || obj.total_room || obj.total || obj.jumlah || 0;
      const good = obj.good || obj.baik || 0;
      const moderate_damage = obj.moderate_damage || obj.rusakSedang || 0;
      const heavy_damage = obj.heavy_damage || obj.rusakBerat || 0;

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
      const hasFacilityData = (d) => {
        const parsed = safeParseJson(d);
        if (!parsed || typeof parsed !== "object") return false;
        if (Object.keys(parsed).length > 0) return true;
        const total =
          parsed.total_all ??
          parsed.total_room ??
          parsed.total ??
          parsed.jumlah;
        return total != null;
      };

      const p = schoolN;
      const pr = schoolN.prasarana || {};

      const labs = [
        {
          title: "Lab. Komputer",
          data: p.laboratory_comp || pr.laboratory_comp,
          icon: <Computer className="h-5 w-5 text-blue-600" />,
        },
        {
          title: "Lab. Bahasa",
          data: p.laboratory_langua || pr.laboratory_langua,
          icon: <Languages className="h-5 w-5 text-green-600" />,
        },
        {
          title: "Lab. IPA",
          data: p.laboratory_ipa || pr.laboratory_ipa,
          icon: <FlaskConical className="h-5 w-5 text-purple-600" />,
        },
        {
          title: "Lab. Fisika",
          data: p.laboratory_fisika || pr.laboratory_fisika,
          icon: <FlaskConical className="h-5 w-5 text-indigo-600" />,
        },
        {
          title: "Lab. Biologi",
          data: p.laboratory_biologi || pr.laboratory_biologi,
          icon: <FlaskConical className="h-5 w-5 text-teal-600" />,
        },
        {
          title: "Laboratorium",
          data: pr.laboratory,
          icon: <FlaskConical className="h-5 w-5 text-purple-600" />,
        },
      ].filter((lab) => hasFacilityData(lab.data));

      // ✅ 4 Kartu Toilet SMP
      const smpToilets = [
        {
          title: "Toilet Guru (Pria)",
          data:
            p.teachers_toilet?.male ||
            pr.teachers_toilet?.male ||
            safeParseJson(pr.teachers_toilet)?.male,
          icon: <Bath className="h-5 w-5 text-blue-500" />,
        },
        {
          title: "Toilet Guru (Wanita)",
          data:
            p.teachers_toilet?.female ||
            pr.teachers_toilet?.female ||
            safeParseJson(pr.teachers_toilet)?.female,
          icon: <Bath className="h-5 w-5 text-pink-500" />,
        },
        {
          title: "Toilet Siswa (Pria)",
          data:
            p.students_toilet?.male ||
            pr.students_toilet?.male ||
            safeParseJson(pr.students_toilet)?.male,
          icon: <Bath className="h-5 w-5 text-blue-500" />,
        },
        {
          title: "Toilet Siswa (Wanita)",
          data:
            p.students_toilet?.female ||
            pr.students_toilet?.female ||
            safeParseJson(pr.students_toilet)?.female,
          icon: <Bath className="h-5 w-5 text-pink-500" />,
        },
      ].filter((t) => hasFacilityData(t.data));

      const supportRooms = [
        {
          title: "Perpustakaan",
          data: p.library || pr.library,
          icon: <Library className="h-5 w-5 text-orange-600" />,
        },
        {
          title: "Ruang Kepsek",
          data: p.kepsek_room,
          icon: <PersonStanding className="h-5 w-5 text-gray-600" />,
        },
        {
          title: "Ruang Guru",
          data: p.teacher_room || pr.teacher_room,
          icon: <Users className="h-5 w-5 text-cyan-600" />,
        },
        {
          title: "Ruang TU",
          data: p.administration_room,
          icon: <Briefcase className="h-5 w-5 text-pink-600" />,
        },
        {
          title: "UKS",
          data: p.uks_room || pr.uks_room,
          icon: <HeartPulse className="h-5 w-5 text-red-600" />,
        },
        {
          title: "Rumah Dinas",
          data:
            p.official_residences ||
            p.rumahDinas ||
            pr.official_residences ||
            pr.rumahDinas,
          icon: <Building className="h-5 w-5 text-gray-600" />,
        },
        // Fallback: jika tidak ada data toilet terpisah, tampilkan toilet gabungan
        smpToilets.length === 0 && {
          title: "Toilet (Gabungan)",
          data: pr.toilets || pr.toiletGuruSiswa,
          icon: <Bath className="h-5 w-5 text-gray-600" />,
        },
      ].filter((room) => room && hasFacilityData(room.data));

      const furniture =
        p.furniture_computer || p.mebeulair || pr.mebeulair || {};
      const mejaData =
        furniture?.tables && typeof furniture.tables === "object"
          ? furniture.tables
          : {};

      const kursiData =
        furniture?.chairs && typeof furniture.chairs === "object"
          ? furniture.chairs
          : {};

      const rusakSum = (x) =>
        toNum(x?.moderate_damage ?? x?.rusakSedang) +
        toNum(x?.heavy_damage ?? x?.rusakBerat);

      const classCondition =
        p.class_condition ||
        p.ruangKelas ||
        pr.classrooms ||
        pr.ruangKelas ||
        {};
      const classTotal = toNum(
        classCondition.total_room ??
          classCondition.jumlah ??
          classCondition.total ??
          classCondition.total_all
      );

      const classGood = toNum(
        classCondition.classrooms_good ??
          classCondition.baik ??
          classCondition.good
      );

      const classLight = toNum(
        classCondition.classrooms_light_damage ??
          classCondition.classrooms_minor_damage ??
          classCondition.light_damage ??
          classCondition.rusakRingan ??
          classCondition.rusak_ringan
      );

      const classModerate = toNum(
        classCondition.classrooms_moderate_damage ??
          classCondition.moderate_damage ??
          classCondition.rusakSedang ??
          classCondition.rusak_sedang
      );

      const classHeavy = toNum(
        classCondition.classrooms_heavy_damage ??
          classCondition.heavy_damage ??
          classCondition.rusakBerat ??
          classCondition.rusak_berat
      );

      const classDamageTotal = toNum(
        classCondition.rusakTotal ??
          classCondition.rusak_total ??
          classCondition.classrooms_damage_total ??
          classCondition.damage_total
      );

      const kurangRkb = toNum(
        classCondition.kurangRkb ?? classCondition.kurang_rkb
      );
      const kelebihan = toNum(classCondition.kelebihan);
      const rkbTambahan = toNum(
        classCondition.rkbTambahan ?? classCondition.rkb_tambahan
      );
      const lahan = classCondition.lahan ?? "-";

      return (
        <div className="space-y-6">
          {/* Ukuran Lahan & Gedung */}
          <div>
            <h4 className="text-card-foreground mb-3">Ukuran Lahan & Gedung</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center border">
                <p className="text-xl font-bold text-gray-800">
                  {toNum(pr.ukuran?.tanah)}
                  <span className="text-sm font-normal"> m²</span>
                </p>
                <p className="text-xs text-gray-500">Luas Tanah</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center border">
                <p className="text-xl font-bold text-gray-800">
                  {toNum(pr.ukuran?.bangunan)}
                  <span className="text-sm font-normal"> m²</span>
                </p>
                <p className="text-xs text-gray-500">Luas Bangunan</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center border">
                <p className="text-xl font-bold text-gray-800">
                  {toNum(pr.ukuran?.halaman)}
                  <span className="text-sm font-normal"> m²</span>
                </p>
                <p className="text-xs text-gray-500">Luas Halaman</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center border">
                <p className="text-xl font-bold text-gray-800">
                  {toNum(pr.gedung?.jumlah)}
                </p>
                <p className="text-xs text-gray-500">Jumlah Gedung</p>
              </div>
            </div>
          </div>

          {classCondition && typeof classCondition === "object" && (
            <div>
              <h4 className="text-card-foreground mb-3">Kondisi Ruang Kelas</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gray-50 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {classTotal}
                  </p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>

                <div className="bg-green-50 border-green-200 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {classGood}
                  </p>
                  <p className="text-xs text-green-600">Baik</p>
                </div>

                <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">
                    {classLight}
                  </p>
                  <p className="text-xs text-yellow-600">Rusak Ringan</p>
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

                <div className="bg-gray-100 border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {classDamageTotal}
                  </p>
                  <p className="text-xs text-gray-600">Rusak Total</p>
                </div>
              </div>
            </div>
          )}

          {kegiatan && typeof kegiatan === "object" ? (
            <div>
              <h4 className="text-card-foreground mb-3">
                Rencana Kegiatan Fisik (DAK)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {toNum(kegiatan.rehabRuangKelas)}
                  </p>
                  <p className="text-xs text-blue-600">Rehab Ruang Kelas</p>
                </div>
                <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {toNum(kegiatan.pembangunanRKB)}
                  </p>
                  <p className="text-xs text-blue-600">Pembangunan RKB</p>
                </div>
                <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {toNum(kegiatan.rehabToilet)}
                  </p>
                  <p className="text-xs text-blue-600">Rehab Toilet</p>
                </div>
                <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {toNum(kegiatan.pembangunanToilet)}
                  </p>
                  <p className="text-xs text-blue-600">Pembangunan Toilet</p>
                </div>
              </div>
            </div>
          ) : null}

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

          {/* ✅ Tampilkan 4 Kartu Toilet */}
          {smpToilets.length > 0 && (
            <div>
              <h4 className="text-card-foreground mb-3">Rincian Toilet</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {smpToilets.map((t) => (
                  <RoomCard key={t.title} item={t} />
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
                        {toNum(
                          mejaData.total_all ??
                            mejaData.total_room ??
                            mejaData.total ??
                            mejaData.jumlah
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Jumlah</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-600">
                        {toNum(mejaData.good ?? mejaData.baik)}
                      </p>
                      <p className="text-xs text-muted-foreground">Baik</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-600">
                        {rusakSum(mejaData)}
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
                        {toNum(
                          kursiData.total_all ??
                            kursiData.total_room ??
                            kursiData.total ??
                            kursiData.jumlah
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Jumlah</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-600">
                        {toNum(kursiData.good ?? kursiData.baik)}
                      </p>
                      <p className="text-xs text-muted-foreground">Baik</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-600">
                        {rusakSum(kursiData)}
                      </p>
                      <p className="text-xs text-muted-foreground">Rusak</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {kurangRkb || kelebihan || rkbTambahan || lahan !== "-" ? (
              <div>
                <h4 className="text-card-foreground mb-3">
                  Detail Tambahan Ruang Kelas
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 border-red-200 border rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-red-700">
                      {kurangRkb}
                    </p>
                    <p className="text-xs text-red-600">Kurang RKB</p>
                  </div>
                  <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-yellow-700">
                      {kelebihan}
                    </p>
                    <p className="text-xs text-yellow-600">Kelebihan</p>
                  </div>
                  <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-blue-700">
                      {rkbTambahan}
                    </p>
                    <p className="text-xs text-blue-600">RKB Tambahan</p>
                  </div>
                  <div className="bg-gray-100 border rounded-lg p-4 text-center flex flex-col justify-center">
                    <p className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span>{lahan}</span>
                    </p>
                    <p className="text-xs text-gray-600">Ketersediaan Lahan</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <h4 className="text-card-foreground mb-3 flex items-center gap-2">
                <Laptop className="h-4 w-4" /> Lainnya
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-2xl font-bold text-center">
                    {toNum(schoolN.chromebook)}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Jumlah Chromebook
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-2xl font-bold text-center">
                    {toNum(prasarana?.furniture?.computer)}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Jumlah Komputer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback SD/PAUD/PKBM
    const ruangKelas = prasarana.classrooms || prasarana.ruangKelas || {};

    const mejaData =
      prasarana.furniture?.tables || prasarana.mebeulair?.tables || {};
    const kursiData =
      prasarana.furniture?.chairs || prasarana.mebeulair?.chairs || {};

    const calcRusak = (x) => {
      const a = toNum(x?.moderate_damage) + toNum(x?.heavy_damage);
      const b = toNum(x?.rusak);
      return a > 0 ? a : b;
    };

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
              <p className="text-xs text-yellow-600">Kelebihan</p>
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
                    data: prasarana.teacher_room || prasarana.ruangGuru,
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
                      {calcRusak(mejaData)}
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
                      {calcRusak(kursiData)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border flex flex-col items-center justify-center min-h-[120px]">
                <p className="text-2xl font-bold">
                  {toNum(schoolN.chromebook)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Jumlah Chromebook
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border flex flex-col items-center justify-center min-h-[120px]">
                <p className="text-2xl font-bold">
                  {toNum(prasarana?.furniture?.computer)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Jumlah Komputer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ======== INSTITUTIONAL =========
  const renderInstitutionalInfo = () => {
    const data = pick(schoolN, "kelembagaan", {}) || {};

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
