"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  School,
  Users,
  BookOpen,
  Save,
  ArrowLeft,
  Loader2,
  User,
  TrendingUp,
  Building,
  ClipboardList,
} from "lucide-react";

import {
  schoolConfigs,
  createInitialFormData,
} from "@/lib/config/schoolConfig";
import { useDataInput } from "@/hooks/useDataInput";
import { NumberInput, TextInput, SelectInput } from "./ui/FormInputs";
import Stepper from "./Stepper";
import { supabase } from "@/lib/supabase/lib/client";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap.jsx"), {
  ssr: false,
});

// Helper untuk ambil value object bertingkat
const getValue = (obj, path) =>
  path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeStatus = (v) => {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "UNKNOWN";
  if (s === "negeri") return "NEGERI";
  if (s === "swasta") return "SWASTA";
  return s.toUpperCase();
};
const normalizeYesNo = (v) => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s === "ya") return "YA";
  if (s === "tidak") return "TIDAK";
  return s.toUpperCase();
};

const normalizeSudahBelum = (v) => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s === "sudah") return "SUDAH";
  if (s === "belum") return "BELUM";
  // fallback kalau sebelumnya tersimpan YA/TIDAK
  if (s === "ya") return "SUDAH";
  if (s === "tidak") return "BELUM";
  return s.toUpperCase();
};

const normalizePeralatanRumahTangga = (v) => {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const s = raw.toLowerCase();

  // terima data lama yang mungkin sudah terlanjur tersimpan
  if (s === "baik") return "BAIK";
  if (s === "tidak memiliki" || s === "tidak_memiliki") return "TIDAK_MEMILIKI";
  if (s === "harus diganti" || s === "harus_diganti") return "HARUS_DIGANTI";
  if (s === "perlu rehabilitasi" || s === "perlu_rehabilitasi")
    return "PERLU_REHABILITASI";

  return raw.toUpperCase();
};

const STATUS_OPTIONS = [
  { value: "NEGERI", label: "Negeri" },
  { value: "SWASTA", label: "Swasta" },
];

const YESNO_OPTIONS = [
  { value: "YA", label: "Ya" },
  { value: "TIDAK", label: "Tidak" },
];
const SUDAH_BELUM_OPTIONS = [
  { value: "SUDAH", label: "Sudah" },
  { value: "BELUM", label: "Belum" },
];

const PERALATAN_RUMAH_TANGGA_OPTIONS = [
  { value: "TIDAK_MEMILIKI", label: "Tidak Memiliki" },
  { value: "HARUS_DIGANTI", label: "Harus Diganti" },
  { value: "BAIK", label: "Baik" },
  { value: "PERLU_REHABILITASI", label: "Perlu Rehabilitasi" },
];

const LAHAN_OPTIONS = [
  { value: "ADA", label: "Ada" },
  { value: "TIDAK_ADA", label: "Tidak Ada" },
  { value: "TIDAK_TAHU", label: "Tidak Tahu" },
];

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
      { key: "paketC", label: "Lanjut Paket C" },
    ],
    paketC: [
      { key: "pt", label: "Perguruan Tinggi" },
      { key: "bekerja", label: "Bekerja" },
    ],
  },
};
LANJUT_OPTIONS.TK = LANJUT_OPTIONS.PAUD;

export default function DataInputForm({ schoolType, embedded = false }) {
  const router = useRouter();

  // 1) Config & Initial Data
  const config = useMemo(
    () => schoolConfigs[schoolType] || schoolConfigs.default,
    [schoolType]
  );
  const initialData = useMemo(() => createInitialFormData(config), [config]);

  // 2) Hook Form Data
  const { formData, handleChange, errors, validate } = useDataInput(
    config,
    initialData
  );

  // =========================
  // 3) MASTER WILAYAH (Kemendagri)
  // =========================
  const [wilayah, setWilayah] = useState(null);
  const [loadingWilayah, setLoadingWilayah] = useState(false);

  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaOptions, setDesaOptions] = useState([]);

  useEffect(() => {
    const loadWilayah = async () => {
      try {
        setLoadingWilayah(true);
        const res = await fetch("/data/desa-garut.json");
        if (!res.ok)
          throw new Error("Gagal memuat data wilayah desa/kecamatan");
        const data = await res.json();

        const kecArr = Array.isArray(data?.kecamatan) ? data.kecamatan : [];
        const kecOpts = kecArr
          .map((k) => ({
            value: k.kode_kecamatan,
            label: k.nama_kecamatan,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "id"));

        setWilayah(data);
        setKecamatanOptions(kecOpts);
      } catch (err) {
        console.error("Error memuat wilayah:", err);
        setWilayah(null);
        setKecamatanOptions([]);
        setDesaOptions([]);
      } finally {
        setLoadingWilayah(false);
      }
    };

    loadWilayah();
  }, []);

  useEffect(() => {
    if (!wilayah?.kecamatan) return;

    const kecCode = formData?.kecamatan_code || "";
    if (!kecCode) {
      setDesaOptions([]);
      return;
    }

    const kec = wilayah.kecamatan.find(
      (k) => String(k.kode_kecamatan) === String(kecCode)
    );

    const desaList = Array.isArray(kec?.desa) ? kec.desa : [];

    const opts = desaList
      .map((d) => ({
        value: d.kode_desa,
        label: d.nama_desa,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "id"));

    setDesaOptions(opts);
  }, [wilayah, formData?.kecamatan_code]);

  // =========================
  // 4) PAUD/TK rombel type filter
  // =========================
  const activePaudRombelTypes = useMemo(() => {
    if (!config.isPaud || !config.rombelTypes) return [];

    if (schoolType === "TK") {
      return config.rombelTypes.filter(
        (t) => t.key === "tka" || t.key === "tkb"
      );
    }
    if (schoolType === "PAUD") {
      return config.rombelTypes.filter(
        (t) => t.key === "kb" || t.key === "sps_tpa"
      );
    }
    return config.rombelTypes;
  }, [config, schoolType]);

  // 5) Local state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSd = schoolType === "SD";
  const isSmp = schoolType === "SMP";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";
  const isPkbm = schoolType === "PKBM";

  // 6) Sections
  const sections = useMemo(
    () => [
      {
        id: "info",
        title: "Info Sekolah",
        icon: <School className="w-5 h-5" />,
        fields: ["namaSekolah", "npsn"],
      },
      {
        id: "guru",
        title: "Data Guru",
        icon: <User className="w-5 h-5" />,
        fields: [],
      },
      {
        id: "siswa",
        title: "Data Siswa",
        icon: <Users className="w-5 h-5" />,
        fields: [],
      },
      {
        id: "rombel",
        title: "Rombel",
        icon: <BookOpen className="w-5 h-5" />,
        fields: [],
      },
      {
        id: "lanjut",
        title: "Siswa Lanjut",
        icon: <TrendingUp className="w-5 h-5" />,
        fields: [],
      },
      {
        id: "prasarana",
        title: "Prasarana",
        icon: <Building className="w-5 h-5" />,
        fields: [],
      },
      {
        id: "kelembagaan",
        title: "Kelembagaan",
        icon: <ClipboardList className="w-5 h-5" />,
        fields: [],
      },
    ],
    []
  );

  // =========================
  // Helpers
  // =========================
  const sumSiswa = (genderKey) => {
    // PKBM: paket A/B/C per kelas
    if (config.isPkbm && config.pakets) {
      return Object.entries(config.pakets).reduce(
        (total, [paketKey, paket]) => {
          const paketName = `paket${paketKey}`;
          const grades = Array.isArray(paket?.grades) ? paket.grades : [];
          const paketSum = grades.reduce((t, grade) => {
            const val = getValue(
              formData,
              `siswa.${paketName}.kelas${grade}.${genderKey}`
            );
            return t + (Number(val) || 0);
          }, 0);
          return total + paketSum;
        },
        0
      );
    }

    if (config.isPaud && activePaudRombelTypes.length > 0) {
      return activePaudRombelTypes.reduce((total, type) => {
        const val = getValue(formData, `siswa.${type.key}.${genderKey}`);
        return total + (Number(val) || 0);
      }, 0);
    }

    if (config.grades && config.grades.length > 0) {
      return config.grades.reduce((total, grade) => {
        const val = getValue(formData, `siswa.kelas${grade}.${genderKey}`);
        return total + (Number(val) || 0);
      }, 0);
    }

    return 0;
  };

  const totalSiswaComputed = useMemo(() => {
    return sumSiswa("l") + sumSiswa("p");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, config, activePaudRombelTypes]);

  // Guru: jumlah otomatis dari rincian
  const guruTotalComputed = useMemo(() => {
    const g = formData?.guru || {};
    return (
      toNum(g.pns) +
      toNum(g.pppk) +
      toNum(g.pppkParuhWaktu) +
      toNum(g.nonAsnDapodik) +
      toNum(g.nonAsnTidakDapodik)
    );
  }, [formData]);

  const buildRombelMeta = () => {
    const meta = { rombel: {} };

    // PKBM: rombel per paket & kelas
    if (config.isPkbm && config.pakets) {
      Object.entries(config.pakets).forEach(([paketKey, paket]) => {
        const paketName = `paket${paketKey}`;
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        meta.rombel[paketName] = {};
        grades.forEach((grade) => {
          const val = getValue(formData, `rombel.${paketName}.kelas${grade}`);
          meta.rombel[paketName][`kelas${grade}`] = Number(val) || 0;
        });
      });
      return meta;
    }

    if (config.isPaud && activePaudRombelTypes.length > 0) {
      activePaudRombelTypes.forEach((type) => {
        const val = getValue(formData, `rombel.${type.key}`);
        meta.rombel[type.key] = Number(val) || 0;
      });
      return meta;
    }

    if (config.grades && config.grades.length > 0) {
      config.grades.forEach((grade) => {
        const key = `kelas${grade}`;
        const val = getValue(formData, `rombel.${key}`);
        meta.rombel[key] = Number(val) || 0;
      });
    }

    return meta;
  };

  const buildClassesArray = () => {
    const classes = [];

    // ✅ FIX: Hapus "if (config.isPaud) return []"
    // Biarkan logic ini jalan untuk PAUD/TK juga agar data tersimpan di tabel school_classes
    if (
      (config.isPaud || schoolType === "TK" || schoolType === "PAUD") &&
      activePaudRombelTypes.length > 0
    ) {
      activePaudRombelTypes.forEach((type) => {
        // type.key bisa "tka", "tkb", "kb", "sps_tpa"
        const male = Number(getValue(formData, `siswa.${type.key}.l`) || 0);
        const female = Number(getValue(formData, `siswa.${type.key}.p`) || 0);

        if (male > 0) {
          classes.push({
            grade: `${type.key}_L`, // Contoh: "kb_L"
            count: male,
            extra: null,
          });
        }
        if (female > 0) {
          classes.push({
            grade: `${type.key}_P`, // Contoh: "kb_P"
            count: female,
            extra: null,
          });
        }
      });
      // Jangan return dulu jika ingin logic lain jalan, tapi untuk PAUD cukup ini
      return classes;
    }

    // Logic PKBM
    if (config.isPkbm && config.pakets) {
      Object.entries(config.pakets).forEach(([paketKey, paket]) => {
        const paketName = `paket${paketKey}`;
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        grades.forEach((grade) => {
          const base = `siswa.${paketName}.kelas${grade}`;
          const male = Number(getValue(formData, `${base}.l`) || 0);
          const female = Number(getValue(formData, `${base}.p`) || 0);

          if (male > 0) {
            classes.push({
              grade: `${paketName}_kelas${grade}_L`,
              count: male,
              extra: null,
            });
          }
          if (female > 0) {
            classes.push({
              grade: `${paketName}_kelas${grade}_P`,
              count: female,
              extra: null,
            });
          }
        });
      });
      return classes;
    }

    // Logic SD/SMP
    if (config.grades) {
      config.grades.forEach((grade) => {
        const male = Number(getValue(formData, `siswa.kelas${grade}.l`) || 0);
        const female = Number(getValue(formData, `siswa.kelas${grade}.p`) || 0);

        if (male > 0)
          classes.push({ grade: `kelas${grade}_L`, count: male, extra: null });
        if (female > 0)
          classes.push({
            grade: `kelas${grade}_P`,
            count: female,
            extra: null,
          });
      });
    }

    return classes;
  };

  const normalizeGuru = () => {
    const g = formData?.guru || {};

    const pns = toNum(g.pns);
    const pppk = toNum(g.pppk);
    const pppkParuhWaktu = toNum(g.pppkParuhWaktu);
    const nonAsnDapodik = toNum(g.nonAsnDapodik);
    const nonAsnTidakDapodik = toNum(g.nonAsnTidakDapodik);

    const jumlahGuru =
      pns + pppk + pppkParuhWaktu + nonAsnDapodik + nonAsnTidakDapodik;

    return {
      jumlahGuru,
      pns,
      pppk,
      pppkParuhWaktu,
      nonAsnDapodik,
      nonAsnTidakDapodik,
      kekuranganGuru: toNum(g.kekuranganGuru),
    };
  };

  const buildStaffSummaryPayload = (guruMeta) => {
    const total =
      guruMeta.pns +
      guruMeta.pppk +
      guruMeta.pppkParuhWaktu +
      guruMeta.nonAsnDapodik +
      guruMeta.nonAsnTidakDapodik;

    return [
      { role: "guru_pns", count: guruMeta.pns, details: null },
      { role: "guru_pppk", count: guruMeta.pppk, details: null },
      {
        role: "guru_pppk_paruh_waktu",
        count: guruMeta.pppkParuhWaktu,
        details: null,
      },
      {
        role: "guru_non_asn_dapodik",
        count: guruMeta.nonAsnDapodik,
        details: null,
      },
      {
        role: "guru_non_asn_tidak_dapodik",
        count: guruMeta.nonAsnTidakDapodik,
        details: null,
      },
      {
        role: "guru_kekurangan",
        count: guruMeta.kekuranganGuru,
        details: null,
      },
      { role: "guru_total", count: total, details: null },
    ];
  };

  const buildLanjutPayload = () => {
    if (isPkbm) {
      const paketA = getValue(formData, "lanjut.paketA") || {}; // ✅ New
      const paketB = getValue(formData, "lanjut.paketB") || {};
      const paketC = getValue(formData, "lanjut.paketC") || {};
      return {
        // ✅ Payload Baru
        lulusanPaketA: {
          smp: toNum(paketA.smp),
          mts: toNum(paketA.mts),
          pontren: toNum(paketA.pontren),
          paketB: toNum(paketA.paketB),
        },
        lulusanPaketB: {
          sma: toNum(paketB.sma),
          smk: toNum(paketB.smk),
          ma: toNum(paketB.ma),
          pontren: toNum(paketB.pontren),
          paketC: toNum(paketB.paketC),
        },
        lulusanPaketC: {
          pt: toNum(paketC.pt),
          bekerja: toNum(paketC.bekerja),
        },
      };
    }

    const dalamKab = getValue(formData, "lanjut.dalamKab") || {};
    const luarKab = getValue(formData, "lanjut.luarKab") || {};

    return {
      siswaLanjutDalamKab: Object.fromEntries(
        (LANJUT_OPTIONS[schoolType]?.dalamKab || []).map((o) => [
          o.key,
          toNum(dalamKab[o.key]),
        ])
      ),
      siswaLanjutLuarKab: Object.fromEntries(
        (LANJUT_OPTIONS[schoolType]?.luarKab || []).map((o) => [
          o.key,
          toNum(luarKab[o.key]),
        ])
      ),
      siswaTidakLanjut: toNum(getValue(formData, "lanjut.tidakLanjut")),
      siswaBekerja: toNum(getValue(formData, "lanjut.bekerja")),
    };
  };

  const buildPrasaranaPayload = () => {
    const pr = getValue(formData, "prasarana") || {};
    const kg = getValue(formData, "kegiatanFisik") || {};

    const classrooms = pr.classrooms || {};
    const rooms = pr.rooms || {};
    const toiletsGuru = pr.teachers_toilet || {};
    const toiletsSiswa = pr.students_toilet || {};

    const normalizeToiletGender = (x) => ({
      total: toNum(x?.total),
      good: toNum(x?.good),
      moderate_damage: toNum(x?.moderate_damage),
      heavy_damage: toNum(x?.heavy_damage),
    });

    const furniture = pr.furniture || {};
    const tables = furniture.tables || {};
    const chairs = furniture.chairs || {};

    // ✅ SMP labs: simpan per-jenis supaya tab SMP bisa munculin banyak lab
    const labs = pr.labs || {};
    const labPayload = isSmp
      ? {
          laboratory_comp: {
            total_all: toNum(labs?.laboratory_comp?.total_all),
            good: toNum(labs?.laboratory_comp?.good),
            moderate_damage: toNum(labs?.laboratory_comp?.moderate_damage),
            heavy_damage: toNum(labs?.laboratory_comp?.heavy_damage),
          },
          laboratory_langua: {
            total_all: toNum(labs?.laboratory_langua?.total_all),
            good: toNum(labs?.laboratory_langua?.good),
            moderate_damage: toNum(labs?.laboratory_langua?.moderate_damage),
            heavy_damage: toNum(labs?.laboratory_langua?.heavy_damage),
          },
          laboratory_ipa: {
            total_all: toNum(labs?.laboratory_ipa?.total_all),
            good: toNum(labs?.laboratory_ipa?.good),
            moderate_damage: toNum(labs?.laboratory_ipa?.moderate_damage),
            heavy_damage: toNum(labs?.laboratory_ipa?.heavy_damage),
          },
          laboratory_fisika: {
            total_all: toNum(labs?.laboratory_fisika?.total_all),
            good: toNum(labs?.laboratory_fisika?.good),
            moderate_damage: toNum(labs?.laboratory_fisika?.moderate_damage),
            heavy_damage: toNum(labs?.laboratory_fisika?.heavy_damage),
          },
          laboratory_biologi: {
            total_all: toNum(labs?.laboratory_biologi?.total_all),
            good: toNum(labs?.laboratory_biologi?.good),
            moderate_damage: toNum(labs?.laboratory_biologi?.moderate_damage),
            heavy_damage: toNum(labs?.laboratory_biologi?.heavy_damage),
          },
        }
      : {};

    return {
      prasarana: {
        ukuran: {
          tanah: toNum(pr?.ukuran?.tanah),
          bangunan: toNum(pr?.ukuran?.bangunan),
          halaman: toNum(pr?.ukuran?.halaman),
        },
        gedung: {
          jumlah: toNum(pr?.gedung?.jumlah),
        },

        classrooms: {
          total_room: toNum(classrooms.total_room),
          classrooms_good: toNum(classrooms.classrooms_good),
          rusakRingan: toNum(classrooms.rusakRingan),
          classrooms_moderate_damage: toNum(
            classrooms.classrooms_moderate_damage
          ),
          heavy_damage: toNum(classrooms.heavy_damage),
          rusakTotal: toNum(classrooms.rusakTotal),
          kurangRkb: toNum(classrooms.kurangRkb),
          kelebihan: toNum(classrooms.kelebihan),
          rkbTambahan: toNum(classrooms.rkbTambahan),
          lahan: classrooms.lahan || "",
        },

        // ✅ lab per-jenis (SMP)
        ...labPayload,

        // ruangan lain (umum)
        library: {
          total: toNum(rooms.library?.total),
          good: toNum(rooms.library?.good),
          moderate_damage: toNum(rooms.library?.moderate_damage),
          heavy_damage: toNum(rooms.library?.heavy_damage),
        },
        laboratory: {
          total: toNum(rooms.laboratory?.total),
          good: toNum(rooms.laboratory?.good),
          moderate_damage: toNum(rooms.laboratory?.moderate_damage),
          heavy_damage: toNum(rooms.laboratory?.heavy_damage),
        },
        teacher_room: {
          total: toNum(rooms.teacher_room?.total),
          good: toNum(rooms.teacher_room?.good),
          moderate_damage: toNum(rooms.teacher_room?.moderate_damage),
          heavy_damage: toNum(rooms.teacher_room?.heavy_damage),
        },
        uks_room: {
          total: toNum(rooms.uks_room?.total),
          good: toNum(rooms.uks_room?.good),
          moderate_damage: toNum(rooms.uks_room?.moderate_damage),
          heavy_damage: toNum(rooms.uks_room?.heavy_damage),
        },
        toilets: {
          total: toNum(rooms.toilets?.total),
          good: toNum(rooms.toilets?.good),
          moderate_damage: toNum(rooms.toilets?.moderate_damage),
          heavy_damage: toNum(rooms.toilets?.heavy_damage),
        },
        teachers_toilet: {
          male: normalizeToiletGender(toiletsGuru?.male),
          female: normalizeToiletGender(toiletsGuru?.female),
        },
        students_toilet: {
          male: normalizeToiletGender(toiletsSiswa?.male),
          female: normalizeToiletGender(toiletsSiswa?.female),
        },

        official_residences: {
          total: toNum(rooms.official_residences?.total),
          good: toNum(rooms.official_residences?.good),
          moderate_damage: toNum(rooms.official_residences?.moderate_damage),
          heavy_damage: toNum(rooms.official_residences?.heavy_damage),
        },

        mebeulair: {
          tables: {
            total: toNum(tables.total),
            good: toNum(tables.good),
            moderate_damage: toNum(tables.moderate_damage),
            heavy_damage: toNum(tables.heavy_damage),
          },
          chairs: {
            total: toNum(chairs.total),
            good: toNum(chairs.good),
            moderate_damage: toNum(chairs.moderate_damage),
            heavy_damage: toNum(chairs.heavy_damage),
          },
          computer: toNum(furniture.computer),
        },

        chromebook: toNum(pr.chromebook),
      },

      kegiatanFisik: {
        rehabRuangKelas: toNum(kg.rehabRuangKelas),
        pembangunanRKB: toNum(kg.pembangunanRKB),
        rehabToilet: toNum(kg.rehabToilet),
        pembangunanToilet: toNum(kg.pembangunanToilet),
      },
    };
  };

  const buildKelembagaanPayload = () => {
    const k = getValue(formData, "kelembagaan") || {};
    return {
      kelembagaan: {
        peralatanRumahTangga: normalizePeralatanRumahTangga(
          k.peralatanRumahTangga
        ),
        pembinaan: normalizeSudahBelum(k.pembinaan),
        asesmen: normalizeSudahBelum(k.asesmen),
        menyelenggarakanBelajar: normalizeYesNo(k.menyelenggarakanBelajar),
        melaksanakanRekomendasi: normalizeYesNo(k.melaksanakanRekomendasi),
        siapDievaluasi: normalizeYesNo(k.siapDievaluasi),
        bop: {
          pengelola: normalizeYesNo(k.bop?.pengelola),
          tenagaPeningkatan: normalizeYesNo(k.bop?.tenagaPeningkatan),
        },
        perizinan: {
          pengendalian: normalizeYesNo(k.perizinan?.pengendalian),
          kelayakan: normalizeYesNo(k.perizinan?.kelayakan),
        },
        kurikulum: {
          silabus: normalizeYesNo(k.kurikulum?.silabus),
          kompetensiDasar: normalizeYesNo(k.kurikulum?.kompetensiDasar),
        },
      },
    };
  };

  // =========================
  // Step handlers
  // =========================
  const handleNext = () => {
    const currentFields = sections[currentStep - 1].fields;
    if (validate(currentFields)) {
      setCompletedSteps((prev) => ({ ...prev, [currentStep - 1]: true }));
      if (currentStep < sections.length) setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSave = async () => {
    const currentFields = sections[currentStep - 1].fields;

    if (!validate(currentFields)) {
      alert("Mohon lengkapi data di halaman ini terlebih dahulu.");
      return;
    }

    setSaving(true);

    try {
      const totalMale = sumSiswa("l");
      const totalFemale = sumSiswa("p");
      const rombelMeta = buildRombelMeta();
      const classes = buildClassesArray();

      const kecOpt = kecamatanOptions.find(
        (o) => String(o.value) === String(formData.kecamatan_code)
      );
      const desaOpt = desaOptions.find(
        (o) => String(o.value) === String(formData.desa_code)
      );

      const kecamatanName = formData.kecamatan || kecOpt?.label || "";
      const desaName = formData.desa || desaOpt?.label || "";

      const location = {
        province: "Jawa Barat",
        district: "Garut",
        subdistrict: kecamatanName,
        village: desaName,
        extra: {
          address_detail: formData.alamat || "",
          latitude: formData.latitude ? Number(formData.latitude) : null,
          longitude: formData.longitude ? Number(formData.longitude) : null,
          kecamatan_code: formData.kecamatan_code || null,
          desa_code: formData.desa_code || null,
        },
      };

      const guruMeta = normalizeGuru();
      const staff_summary = buildStaffSummaryPayload(guruMeta);

      const lanjutPayload = buildLanjutPayload();
      const prasaranaPayload = buildPrasaranaPayload();
      const kelembagaanPayload = buildKelembagaanPayload();

      const school = {
        npsn: formData.npsn,
        name: formData.namaSekolah,
        address: formData.alamat || "",
        village_name: desaName || "",
        school_type_id: config.schoolTypeId ?? null,
        status: normalizeStatus(formData.status) || "UNKNOWN",
        student_count: totalMale + totalFemale,
        st_male: totalMale,
        st_female: totalFemale,
        lat: formData.latitude ? Number(formData.latitude) : null,
        lng: formData.longitude ? Number(formData.longitude) : null,
        facilities: null,
        class_condition: null,

        meta: {
          ...rombelMeta,
          jenjang: schoolType,
          kecamatan: kecamatanName,
          desa: desaName,
          kecamatan_code: formData.kecamatan_code || null,
          desa_code: formData.desa_code || null,
          alamat: formData.alamat || "",
          is_paud: config.isPaud || false,
          monthly_report_file: formData.monthly_report_file || null,
          bantuan_received: formData.bantuan_received || "",
          guru: guruMeta,
          is_test: formData.is_test ?? false,

          ...lanjutPayload,
          ...prasaranaPayload,
          ...kelembagaanPayload,
        },

        contact: {
          operator_name: formData.namaOperator || "",
          operator_phone: formData.hp || "",
        },
      };

      const payload = { location, school, classes, staff_summary };
      console.log("SAVE schoolType:", schoolType);
      console.log("SAVE meta.jenjang:", school.meta?.jenjang);

      const { error } = await supabase.rpc("insert_school_with_relations", {
        p_payload: payload,
      });

      if (error) throw new Error(error.message || "Gagal menyimpan data");

      alert("Data berhasil disimpan!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSelected = (lat, lng) => {
    handleChange("latitude", lat);
    handleChange("longitude", lng);
    setShowMap(false);
  };

  // =========================
  // Render content
  // =========================
  const renderContent = () => {
    const section = sections[currentStep - 1];
    if (!formData) return <div>Loading form data...</div>;

    switch (section.id) {
      case "info":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextInput
              label="Nama Sekolah"
              value={formData.namaSekolah || ""}
              onChange={(v) => handleChange("namaSekolah", v)}
              error={errors.namaSekolah}
              required
            />

            <TextInput
              label="NPSN"
              value={formData.npsn || ""}
              onChange={(v) => handleChange("npsn", v)}
              error={errors.npsn}
              required
            />

            <SelectInput
              label="Status Sekolah"
              value={normalizeStatus(formData.status || "SWASTA")}
              onChange={(v) => handleChange("status", v)}
              error={errors.status}
              options={STATUS_OPTIONS}
              placeholder="Pilih Status..."
            />

            <SelectInput
              label="Kecamatan"
              value={formData.kecamatan_code || ""}
              onChange={(kode) => {
                const opt = kecamatanOptions.find(
                  (o) => String(o.value) === String(kode)
                );
                handleChange("kecamatan_code", kode);
                handleChange("kecamatan", opt?.label || "");

                handleChange("desa_code", "");
                handleChange("desa", "");
              }}
              error={errors.kecamatan_code}
              options={kecamatanOptions}
              placeholder={loadingWilayah ? "Memuat..." : "Pilih Kecamatan..."}
              disabled={loadingWilayah || kecamatanOptions.length === 0}
            />

            <div className="space-y-1">
              <SelectInput
                label="Desa/Kelurahan"
                value={formData.desa_code || ""}
                onChange={(kode) => {
                  const opt = desaOptions.find(
                    (o) => String(o.value) === String(kode)
                  );
                  handleChange("desa_code", kode);
                  handleChange("desa", opt?.label || "");
                }}
                error={errors.desa_code}
                options={desaOptions}
                placeholder={
                  formData.kecamatan_code
                    ? "Pilih Desa/Kelurahan..."
                    : "Pilih Kecamatan dulu..."
                }
                disabled={
                  !formData.kecamatan_code ||
                  loadingWilayah ||
                  desaOptions.length === 0
                }
              />

              {formData.kecamatan_code &&
                !loadingWilayah &&
                desaOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Data desa untuk kecamatan ini tidak ditemukan (cek file
                    desa-garut.json).
                  </p>
                )}
            </div>

            <TextInput
              label="Alamat Lengkap"
              value={formData.alamat || ""}
              onChange={(v) => handleChange("alamat", v)}
              error={errors.alamat}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Koordinat
              </label>

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Latitude"
                  value={formData.latitude || ""}
                  onChange={(v) => handleChange("latitude", v)}
                  error={errors.latitude}
                  placeholder="-6.9"
                />
                <TextInput
                  label="Longitude"
                  value={formData.longitude || ""}
                  onChange={(v) => handleChange("longitude", v)}
                  error={errors.longitude}
                  placeholder="107.5"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Pilih Koordinat di Map
              </button>

              <p className="text-xs text-gray-500">
                Isi koordinat manual atau pilih titik di peta.
              </p>
            </div>
          </div>
        );

      case "guru":
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-semibold text-blue-900">
                Total Guru:{" "}
                {Number(guruTotalComputed || 0).toLocaleString("id-ID")}
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput
                label="PNS"
                value={getValue(formData, "guru.pns")}
                onChange={(v) => handleChange("guru.pns", v)}
              />
              <NumberInput
                label="PPPK"
                value={getValue(formData, "guru.pppk")}
                onChange={(v) => handleChange("guru.pppk", v)}
              />
              <NumberInput
                label="PPPK Paruh Waktu"
                value={getValue(formData, "guru.pppkParuhWaktu")}
                onChange={(v) => handleChange("guru.pppkParuhWaktu", v)}
              />
              <NumberInput
                label="Non ASN (Dapodik)"
                value={getValue(formData, "guru.nonAsnDapodik")}
                onChange={(v) => handleChange("guru.nonAsnDapodik", v)}
              />
              <NumberInput
                label="Non ASN (Tidak Dapodik)"
                value={getValue(formData, "guru.nonAsnTidakDapodik")}
                onChange={(v) => handleChange("guru.nonAsnTidakDapodik", v)}
              />
              <NumberInput
                label="Kekurangan Guru"
                value={getValue(formData, "guru.kekuranganGuru")}
                onChange={(v) => handleChange("guru.kekuranganGuru", v)}
              />
            </div>
          </div>
        );

      case "siswa":
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-semibold text-blue-900">
                Total Siswa:{" "}
                {Number(totalSiswaComputed || 0).toLocaleString("id-ID")}
              </h4>
            </div>

            {/* PKBM */}
            {config.isPkbm && config.pakets ? (
              <div className="space-y-4">
                {Object.entries(config.pakets).map(([paketKey, paket]) => {
                  const paketName = `paket${paketKey}`;
                  const grades = Array.isArray(paket?.grades)
                    ? paket.grades
                    : [];
                  return (
                    <div
                      key={paketName}
                      className="p-4 border rounded-lg bg-gray-50/50 space-y-4"
                    >
                      <p className="font-medium">{paket?.name || paketName}</p>
                      {grades.map((grade) => (
                        <div
                          key={`${paketName}-kelas${grade}`}
                          className="grid grid-cols-2 gap-4"
                        >
                          <NumberInput
                            label={`Kelas ${grade} - Laki-laki`}
                            value={getValue(
                              formData,
                              `siswa.${paketName}.kelas${grade}.l`
                            )}
                            onChange={(v) =>
                              handleChange(
                                `siswa.${paketName}.kelas${grade}.l`,
                                v
                              )
                            }
                          />
                          <NumberInput
                            label={`Kelas ${grade} - Perempuan`}
                            value={getValue(
                              formData,
                              `siswa.${paketName}.kelas${grade}.p`
                            )}
                            onChange={(v) =>
                              handleChange(
                                `siswa.${paketName}.kelas${grade}.p`,
                                v
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {config.grades &&
                  config.grades.map((grade) => (
                    <div
                      key={grade}
                      className="p-4 border rounded-lg bg-gray-50/50"
                    >
                      <p className="font-medium mb-3">Kelas {grade}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                          label="Laki-laki"
                          value={getValue(formData, `siswa.kelas${grade}.l`)}
                          onChange={(v) =>
                            handleChange(`siswa.kelas${grade}.l`, v)
                          }
                        />
                        <NumberInput
                          label="Perempuan"
                          value={getValue(formData, `siswa.kelas${grade}.p`)}
                          onChange={(v) =>
                            handleChange(`siswa.kelas${grade}.p`, v)
                          }
                        />
                      </div>
                    </div>
                  ))}

                {config.isPaud &&
                  activePaudRombelTypes.length > 0 &&
                  activePaudRombelTypes.map((type) => (
                    <div
                      key={type.key}
                      className="p-4 border rounded-lg bg-gray-50/50"
                    >
                      <p className="font-medium mb-3">{type.label}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                          label="Laki-laki"
                          value={getValue(formData, `siswa.${type.key}.l`)}
                          onChange={(v) =>
                            handleChange(`siswa.${type.key}.l`, v)
                          }
                        />
                        <NumberInput
                          label="Perempuan"
                          value={getValue(formData, `siswa.${type.key}.p`)}
                          onChange={(v) =>
                            handleChange(`siswa.${type.key}.p`, v)
                          }
                        />
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        );

      case "rombel":
        if (config.isPkbm && config.pakets) {
          return (
            <div className="space-y-4">
              {Object.entries(config.pakets).map(([paketKey, paket]) => {
                const paketName = `paket${paketKey}`;
                const grades = Array.isArray(paket?.grades) ? paket.grades : [];
                return (
                  <div
                    key={paketName}
                    className="p-4 border rounded-lg bg-gray-50/50"
                  >
                    <p className="font-medium mb-3">
                      {paket?.name || paketName}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {grades.map((grade) => (
                        <NumberInput
                          key={`${paketName}-rombel-kelas${grade}`}
                          label={`Rombel Kelas ${grade}`}
                          value={getValue(
                            formData,
                            `rombel.${paketName}.kelas${grade}`
                          )}
                          onChange={(v) =>
                            handleChange(`rombel.${paketName}.kelas${grade}`, v)
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        if (config.isPaud && activePaudRombelTypes.length > 0) {
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activePaudRombelTypes.map((type) => (
                <NumberInput
                  key={`rombel-${type.key}`}
                  label={`Rombel ${type.label}`}
                  value={getValue(formData, `rombel.${type.key}`)}
                  onChange={(v) => handleChange(`rombel.${type.key}`, v)}
                />
              ))}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {config.grades &&
              config.grades.map((grade) => (
                <NumberInput
                  key={`rombel-${grade}`}
                  label={`Rombel Kelas ${grade}`}
                  value={getValue(formData, `rombel.kelas${grade}`)}
                  onChange={(v) => handleChange(`rombel.kelas${grade}`, v)}
                />
              ))}
          </div>
        );

      case "lanjut": {
        const opt = LANJUT_OPTIONS[schoolType];
        if (!opt) {
          return (
            <p className="text-muted-foreground">
              Tidak berlaku untuk jenjang ini.
            </p>
          );
        }

        if (isPkbm) {
          return (
            <div className="space-y-6">
              {/* ✅ Form Paket A Baru */}
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Kelanjutan Lulusan Paket A</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {opt.paketA?.map((o) => (
                    <NumberInput
                      key={`lanjut-paketA-${o.key}`}
                      label={o.label}
                      value={getValue(formData, `lanjut.paketA.${o.key}`)}
                      onChange={(v) =>
                        handleChange(`lanjut.paketA.${o.key}`, v)
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Kelanjutan Lulusan Paket B</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {opt.paketB?.map((o) => (
                    <NumberInput
                      key={`lanjut-paketB-${o.key}`}
                      label={o.label}
                      value={getValue(formData, `lanjut.paketB.${o.key}`)}
                      onChange={(v) =>
                        handleChange(`lanjut.paketB.${o.key}`, v)
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Kelanjutan Lulusan Paket C</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {opt.paketC?.map((o) => (
                    <NumberInput
                      key={`lanjut-paketC-${o.key}`}
                      label={o.label}
                      value={getValue(formData, `lanjut.paketC.${o.key}`)}
                      onChange={(v) =>
                        handleChange(`lanjut.paketC.${o.key}`, v)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Melanjutkan Dalam Kabupaten</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(opt.dalamKab || []).map((o) => (
                  <NumberInput
                    key={`lanjut-dalam-${o.key}`}
                    label={o.label}
                    value={getValue(formData, `lanjut.dalamKab.${o.key}`)}
                    onChange={(v) =>
                      handleChange(`lanjut.dalamKab.${o.key}`, v)
                    }
                  />
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Melanjutkan Luar Kabupaten</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(opt.luarKab || []).map((o) => (
                  <NumberInput
                    key={`lanjut-luar-${o.key}`}
                    label={o.label}
                    value={getValue(formData, `lanjut.luarKab.${o.key}`)}
                    onChange={(v) => handleChange(`lanjut.luarKab.${o.key}`, v)}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Tidak Melanjutkan / Bekerja</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Tidak Melanjutkan"
                  value={getValue(formData, "lanjut.tidakLanjut")}
                  onChange={(v) => handleChange("lanjut.tidakLanjut", v)}
                />
                <NumberInput
                  label="Bekerja"
                  value={getValue(formData, "lanjut.bekerja")}
                  onChange={(v) => handleChange("lanjut.bekerja", v)}
                />
              </div>
            </div>
          </div>
        );
      }

      case "prasarana": {
        // ✅ daftar lab SMP (key = yang dipakai SchoolDetailsTabs)
        const SMP_LABS = [
          { key: "laboratory_comp", label: "Lab. Komputer" },
          { key: "laboratory_langua", label: "Lab. Bahasa" },
          { key: "laboratory_ipa", label: "Lab. IPA" },
          { key: "laboratory_fisika", label: "Lab. Fisika" },
          { key: "laboratory_biologi", label: "Lab. Biologi" },
        ];

        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Ukuran & Gedung</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Luas Tanah (m²)"
                  value={getValue(formData, "prasarana.ukuran.tanah")}
                  onChange={(v) => handleChange("prasarana.ukuran.tanah", v)}
                />
                <NumberInput
                  label="Luas Bangunan (m²)"
                  value={getValue(formData, "prasarana.ukuran.bangunan")}
                  onChange={(v) => handleChange("prasarana.ukuran.bangunan", v)}
                />
                <NumberInput
                  label="Luas Halaman (m²)"
                  value={getValue(formData, "prasarana.ukuran.halaman")}
                  onChange={(v) => handleChange("prasarana.ukuran.halaman", v)}
                />
                <NumberInput
                  label="Jumlah Gedung"
                  value={getValue(formData, "prasarana.gedung.jumlah")}
                  onChange={(v) => handleChange("prasarana.gedung.jumlah", v)}
                />
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Kondisi Ruang Kelas</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <NumberInput
                  label="Total Ruang"
                  value={getValue(formData, "prasarana.classrooms.total_room")}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.total_room", v)
                  }
                />
                <NumberInput
                  label="Baik"
                  value={getValue(
                    formData,
                    "prasarana.classrooms.classrooms_good"
                  )}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.classrooms_good", v)
                  }
                />
                <NumberInput
                  label="Rusak Ringan"
                  value={getValue(formData, "prasarana.classrooms.rusakRingan")}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.rusakRingan", v)
                  }
                />
                <NumberInput
                  label="Rusak Sedang"
                  value={getValue(
                    formData,
                    "prasarana.classrooms.classrooms_moderate_damage"
                  )}
                  onChange={(v) =>
                    handleChange(
                      "prasarana.classrooms.classrooms_moderate_damage",
                      v
                    )
                  }
                />
                <NumberInput
                  label="Rusak Berat"
                  value={getValue(
                    formData,
                    "prasarana.classrooms.heavy_damage"
                  )}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.heavy_damage", v)
                  }
                />
                <NumberInput
                  label="Rusak Total"
                  value={getValue(formData, "prasarana.classrooms.rusakTotal")}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.rusakTotal", v)
                  }
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <NumberInput
                  label="Kurang RKB"
                  value={getValue(formData, "prasarana.classrooms.kurangRkb")}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.kurangRkb", v)
                  }
                />
                <NumberInput
                  label="Kelebihan (Tak Terawat)"
                  value={getValue(formData, "prasarana.classrooms.kelebihan")}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.kelebihan", v)
                  }
                />
                <NumberInput
                  label="RKB Tambahan"
                  value={getValue(formData, "prasarana.classrooms.rkbTambahan")}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.rkbTambahan", v)
                  }
                />
                <SelectInput
                  label="Ketersediaan Lahan"
                  value={getValue(formData, "prasarana.classrooms.lahan") || ""}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.lahan", v)
                  }
                  options={LAHAN_OPTIONS}
                  placeholder="Pilih..."
                />
              </div>
            </div>

            {/* ✅ BARU: Laboratorium (SMP) per jenis */}
            {isSmp && (
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Laboratorium (SMP)</p>
                <div className="space-y-4">
                  {SMP_LABS.map((lab) => (
                    <div
                      key={lab.key}
                      className="p-3 border rounded-lg bg-white"
                    >
                      <p className="font-medium mb-3">{lab.label}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <NumberInput
                          label="Total"
                          value={getValue(
                            formData,
                            `prasarana.labs.${lab.key}.total_all`
                          )}
                          onChange={(v) =>
                            handleChange(
                              `prasarana.labs.${lab.key}.total_all`,
                              v
                            )
                          }
                        />
                        <NumberInput
                          label="Baik"
                          value={getValue(
                            formData,
                            `prasarana.labs.${lab.key}.good`
                          )}
                          onChange={(v) =>
                            handleChange(`prasarana.labs.${lab.key}.good`, v)
                          }
                        />
                        <NumberInput
                          label="Rusak Sedang"
                          value={getValue(
                            formData,
                            `prasarana.labs.${lab.key}.moderate_damage`
                          )}
                          onChange={(v) =>
                            handleChange(
                              `prasarana.labs.${lab.key}.moderate_damage`,
                              v
                            )
                          }
                        />
                        <NumberInput
                          label="Rusak Berat"
                          value={getValue(
                            formData,
                            `prasarana.labs.${lab.key}.heavy_damage`
                          )}
                          onChange={(v) =>
                            handleChange(
                              `prasarana.labs.${lab.key}.heavy_damage`,
                              v
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Ini akan tersimpan ke <code>meta.prasarana.laboratory_*</code>{" "}
                  supaya tab Prasarana SMP bisa menampilkan lab per jenis.
                </p>
              </div>
            )}

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Kondisi Ruangan Lainnya</p>
              {isSmp && (
                <div className="p-4 border rounded-lg bg-gray-50/50">
                  <p className="font-medium mb-3">Rincian Toilet (SMP)</p>

                  {[
                    { key: "teachers_toilet", label: "Toilet Guru" },
                    { key: "students_toilet", label: "Toilet Siswa" },
                  ].map((group) => (
                    <div key={group.key} className="mb-4">
                      <p className="font-medium mb-2">{group.label}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { g: "male", label: "Pria" },
                          { g: "female", label: "Wanita" },
                        ].map((sex) => (
                          <div
                            key={sex.g}
                            className="p-3 border rounded-lg bg-white"
                          >
                            <p className="text-sm font-medium mb-2">
                              {sex.label}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <NumberInput
                                label="Total"
                                value={getValue(
                                  formData,
                                  `prasarana.${group.key}.${sex.g}.total`
                                )}
                                onChange={(v) =>
                                  handleChange(
                                    `prasarana.${group.key}.${sex.g}.total`,
                                    v
                                  )
                                }
                              />
                              <NumberInput
                                label="Baik"
                                value={getValue(
                                  formData,
                                  `prasarana.${group.key}.${sex.g}.good`
                                )}
                                onChange={(v) =>
                                  handleChange(
                                    `prasarana.${group.key}.${sex.g}.good`,
                                    v
                                  )
                                }
                              />
                              <NumberInput
                                label="Rusak Sedang"
                                value={getValue(
                                  formData,
                                  `prasarana.${group.key}.${sex.g}.moderate_damage`
                                )}
                                onChange={(v) =>
                                  handleChange(
                                    `prasarana.${group.key}.${sex.g}.moderate_damage`,
                                    v
                                  )
                                }
                              />
                              <NumberInput
                                label="Rusak Berat"
                                value={getValue(
                                  formData,
                                  `prasarana.${group.key}.${sex.g}.heavy_damage`
                                )}
                                onChange={(v) =>
                                  handleChange(
                                    `prasarana.${group.key}.${sex.g}.heavy_damage`,
                                    v
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {[
                  { key: "library", label: "Perpustakaan" },
                  { key: "laboratory", label: "Laboratorium (Umum)" },
                  { key: "teacher_room", label: "Ruang Guru" },
                  { key: "uks_room", label: "UKS" },
                  { key: "toilets", label: "Toilet" },
                  { key: "official_residences", label: "Rumah Dinas" },
                ].map((r) => (
                  <div
                    key={r.key}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    <NumberInput
                      label={`${r.label} - Total`}
                      value={getValue(
                        formData,
                        `prasarana.rooms.${r.key}.total`
                      )}
                      onChange={(v) =>
                        handleChange(`prasarana.rooms.${r.key}.total`, v)
                      }
                    />
                    <NumberInput
                      label="Baik"
                      value={getValue(
                        formData,
                        `prasarana.rooms.${r.key}.good`
                      )}
                      onChange={(v) =>
                        handleChange(`prasarana.rooms.${r.key}.good`, v)
                      }
                    />
                    <NumberInput
                      label="Rusak Sedang"
                      value={getValue(
                        formData,
                        `prasarana.rooms.${r.key}.moderate_damage`
                      )}
                      onChange={(v) =>
                        handleChange(
                          `prasarana.rooms.${r.key}.moderate_damage`,
                          v
                        )
                      }
                    />
                    <NumberInput
                      label="Rusak Berat"
                      value={getValue(
                        formData,
                        `prasarana.rooms.${r.key}.heavy_damage`
                      )}
                      onChange={(v) =>
                        handleChange(`prasarana.rooms.${r.key}.heavy_damage`, v)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Mebeulair & TIK</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <NumberInput
                  label="Meja - Total"
                  value={getValue(formData, "prasarana.furniture.tables.total")}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.tables.total", v)
                  }
                />
                <NumberInput
                  label="Meja - Baik"
                  value={getValue(formData, "prasarana.furniture.tables.good")}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.tables.good", v)
                  }
                />
                <NumberInput
                  label="Meja - Rusak Sedang"
                  value={getValue(
                    formData,
                    "prasarana.furniture.tables.moderate_damage"
                  )}
                  onChange={(v) =>
                    handleChange(
                      "prasarana.furniture.tables.moderate_damage",
                      v
                    )
                  }
                />
                <NumberInput
                  label="Meja - Rusak Berat"
                  value={getValue(
                    formData,
                    "prasarana.furniture.tables.heavy_damage"
                  )}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.tables.heavy_damage", v)
                  }
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <NumberInput
                  label="Kursi - Total"
                  value={getValue(formData, "prasarana.furniture.chairs.total")}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.chairs.total", v)
                  }
                />
                <NumberInput
                  label="Kursi - Baik"
                  value={getValue(formData, "prasarana.furniture.chairs.good")}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.chairs.good", v)
                  }
                />
                <NumberInput
                  label="Kursi - Rusak Sedang"
                  value={getValue(
                    formData,
                    "prasarana.furniture.chairs.moderate_damage"
                  )}
                  onChange={(v) =>
                    handleChange(
                      "prasarana.furniture.chairs.moderate_damage",
                      v
                    )
                  }
                />
                <NumberInput
                  label="Kursi - Rusak Berat"
                  value={getValue(
                    formData,
                    "prasarana.furniture.chairs.heavy_damage"
                  )}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.chairs.heavy_damage", v)
                  }
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <NumberInput
                  label="Jumlah Komputer"
                  value={getValue(formData, "prasarana.furniture.computer")}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.computer", v)
                  }
                />
                <NumberInput
                  label="Jumlah Chromebook"
                  value={getValue(formData, "prasarana.chromebook")}
                  onChange={(v) => handleChange("prasarana.chromebook", v)}
                />
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Rencana Kegiatan Fisik (DAK)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Rehab Ruang Kelas"
                  value={getValue(formData, "kegiatanFisik.rehabRuangKelas")}
                  onChange={(v) =>
                    handleChange("kegiatanFisik.rehabRuangKelas", v)
                  }
                />
                <NumberInput
                  label="Pembangunan RKB"
                  value={getValue(formData, "kegiatanFisik.pembangunanRKB")}
                  onChange={(v) =>
                    handleChange("kegiatanFisik.pembangunanRKB", v)
                  }
                />
                <NumberInput
                  label="Rehab Toilet"
                  value={getValue(formData, "kegiatanFisik.rehabToilet")}
                  onChange={(v) => handleChange("kegiatanFisik.rehabToilet", v)}
                />
                <NumberInput
                  label="Pembangunan Toilet"
                  value={getValue(formData, "kegiatanFisik.pembangunanToilet")}
                  onChange={(v) =>
                    handleChange("kegiatanFisik.pembangunanToilet", v)
                  }
                />
              </div>
            </div>
          </div>
        );
      }

      case "kelembagaan":
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Status Kelembagaan</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectInput
                  label="Peralatan Rumah Tangga"
                  value={normalizePeralatanRumahTangga(
                    getValue(formData, "kelembagaan.peralatanRumahTangga") || ""
                  )}
                  onChange={(v) =>
                    handleChange("kelembagaan.peralatanRumahTangga", v)
                  }
                  options={PERALATAN_RUMAH_TANGGA_OPTIONS}
                  placeholder="Pilih..."
                />

                <SelectInput
                  label="Pembinaan"
                  value={normalizeSudahBelum(
                    getValue(formData, "kelembagaan.pembinaan") || ""
                  )}
                  onChange={(v) => handleChange("kelembagaan.pembinaan", v)}
                  options={SUDAH_BELUM_OPTIONS}
                  placeholder="Pilih..."
                />

                <SelectInput
                  label="Asesmen"
                  value={normalizeSudahBelum(
                    getValue(formData, "kelembagaan.asesmen") || ""
                  )}
                  onChange={(v) => handleChange("kelembagaan.asesmen", v)}
                  options={SUDAH_BELUM_OPTIONS}
                  placeholder="Pilih..."
                />

                <SelectInput
                  label="Menyelenggarakan Belajar"
                  value={
                    getValue(formData, "kelembagaan.menyelenggarakanBelajar") ||
                    ""
                  }
                  onChange={(v) =>
                    handleChange("kelembagaan.menyelenggarakanBelajar", v)
                  }
                  options={YESNO_OPTIONS}
                  placeholder="Pilih..."
                />
                <SelectInput
                  label="Melaksanakan Rekomendasi"
                  value={
                    getValue(formData, "kelembagaan.melaksanakanRekomendasi") ||
                    ""
                  }
                  onChange={(v) =>
                    handleChange("kelembagaan.melaksanakanRekomendasi", v)
                  }
                  options={YESNO_OPTIONS}
                  placeholder="Pilih..."
                />
                <SelectInput
                  label="Siap Dievaluasi"
                  value={getValue(formData, "kelembagaan.siapDievaluasi") || ""}
                  onChange={(v) =>
                    handleChange("kelembagaan.siapDievaluasi", v)
                  }
                  options={YESNO_OPTIONS}
                  placeholder="Pilih..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">BOP</p>
                <div className="space-y-4">
                  <SelectInput
                    label="Pengelola"
                    value={
                      getValue(formData, "kelembagaan.bop.pengelola") || ""
                    }
                    onChange={(v) =>
                      handleChange("kelembagaan.bop.pengelola", v)
                    }
                    options={YESNO_OPTIONS}
                    placeholder="Pilih..."
                  />
                  <SelectInput
                    label="Tenaga Ditingkatkan"
                    value={
                      getValue(formData, "kelembagaan.bop.tenagaPeningkatan") ||
                      ""
                    }
                    onChange={(v) =>
                      handleChange("kelembagaan.bop.tenagaPeningkatan", v)
                    }
                    options={YESNO_OPTIONS}
                    placeholder="Pilih..."
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Perizinan</p>
                <div className="space-y-4">
                  <SelectInput
                    label="Pengendalian"
                    value={
                      getValue(
                        formData,
                        "kelembagaan.perizinan.pengendalian"
                      ) || ""
                    }
                    onChange={(v) =>
                      handleChange("kelembagaan.perizinan.pengendalian", v)
                    }
                    options={YESNO_OPTIONS}
                    placeholder="Pilih..."
                  />
                  <SelectInput
                    label="Kelayakan"
                    value={
                      getValue(formData, "kelembagaan.perizinan.kelayakan") ||
                      ""
                    }
                    onChange={(v) =>
                      handleChange("kelembagaan.perizinan.kelayakan", v)
                    }
                    options={YESNO_OPTIONS}
                    placeholder="Pilih..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Kurikulum</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectInput
                  label="Silabus"
                  value={
                    getValue(formData, "kelembagaan.kurikulum.silabus") || ""
                  }
                  onChange={(v) =>
                    handleChange("kelembagaan.kurikulum.silabus", v)
                  }
                  options={YESNO_OPTIONS}
                  placeholder="Pilih..."
                />
                <SelectInput
                  label="Kompetensi Dasar"
                  value={
                    getValue(
                      formData,
                      "kelembagaan.kurikulum.kompetensiDasar"
                    ) || ""
                  }
                  onChange={(v) =>
                    handleChange("kelembagaan.kurikulum.kompetensiDasar", v)
                  }
                  options={YESNO_OPTIONS}
                  placeholder="Pilih..."
                />
              </div>
            </div>
          </div>
        );

      default:
        return <div>Konten belum tersedia</div>;
    }
  };

  return (
    <div
      className={
        embedded
          ? "w-full"
          : "max-w-4xl mx-auto p-6 border rounded-lg bg-white shadow-sm"
      }
    >
      {!embedded && (
        <h1 className="text-2xl font-bold mb-6">Input Data {schoolType}</h1>
      )}

      <div className="mb-8">
        <Stepper
          sections={sections}
          currentStep={currentStep}
          setStep={setCurrentStep}
          completedSteps={completedSteps}
        />
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {renderContent()}

        <div className="flex justify-between items-center pt-6 border-t mt-6">
          <div className="text-sm text-gray-500">
            Langkah {currentStep} dari {sections.length}
          </div>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors"
              >
                Kembali
              </button>
            )}

            {currentStep < sections.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Lanjut
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan Data
              </button>
            )}
          </div>
        </div>
      </form>

      {showMap && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Pilih Lokasi di Peta</h3>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <LocationPickerMap
              onSelectLocation={handleLocationSelected}
              initialCoordinates={
                formData.latitude && formData.longitude
                  ? [Number(formData.latitude), Number(formData.longitude)]
                  : [-7.2167, 107.9]
              }
            />

            <p className="text-xs text-gray-500">
              Setelah pilih titik, latitude & longitude terisi otomatis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
