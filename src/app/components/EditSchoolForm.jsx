// src/app/components/EditSchoolForm.jsx
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
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { schoolConfigs } from "@/lib/config/schoolConfig";
import { Label } from "./ui/label";

import { useDataInput } from "@/hooks/useDataInput";
import { NumberInput, TextInput, SelectInput } from "./ui/FormInputs";
import Stepper from "./Stepper";
import ExcelImportButton from "./ExcelImportButton";
import { supabase } from "@/lib/supabase/lib/client";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap.jsx"), {
  ssr: false,
});

/* --- STATIC HELPERS --- */

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
  if (s === "ya") return "SUDAH";
  if (s === "tidak") return "BELUM";
  return s.toUpperCase();
};

const normalizePeralatanRumahTangga = (v) => {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const s = raw.toLowerCase();
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

function ReadOnlyField({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="leading-none">{label}</Label>
      <div
        className={`h-10 px-3 flex items-center rounded-md border bg-muted text-muted-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

export default function EditSchoolForm({
  schoolType,
  initialData,
  embedded = false,
  schoolId: schoolIdProp = null,
}) {
  const router = useRouter();

  // Optimized ID Finder
  const schoolIdFinal = useMemo(() => {
    if (schoolIdProp) return schoolIdProp;
    if (!initialData) return null;
    return (
      initialData.id ||
      initialData.school_id ||
      initialData.schoolId ||
      initialData.Id ||
      initialData.ID ||
      initialData._id ||
      initialData?.school?.id ||
      null
    );
  }, [schoolIdProp, initialData]);

  useEffect(() => {
    if (!schoolIdFinal && initialData) {
      console.error("❌ CRITICAL: School ID missing.", {
        prop: schoolIdProp,
        dataKeys: Object.keys(initialData),
      });
      toast.error("Terjadi kesalahan sistem: ID Sekolah tidak ditemukan.");
    }
  }, [schoolIdFinal, initialData, schoolIdProp]);

  const config = useMemo(
    () => schoolConfigs[schoolType] || schoolConfigs.default,
    [schoolType]
  );

  // Normalisasi Initial Data
  const normalizedInitialData = useMemo(() => {
    if (!initialData) return null;
    const meta = initialData.meta || {};
    return {
      ...initialData,
      kecamatan_code: initialData.kecamatan_code || meta.kecamatan_code || "",
      desa_code: initialData.desa_code || meta.desa_code || "",
      kecamatan: initialData.kecamatan || meta.kecamatan || "",
      desa: initialData.desa || meta.desa || "",
      siswa: initialData.siswa || meta.siswa || {},
      siswaAbk: initialData.siswaAbk || meta.siswaAbk || {}, // ✅ Added siswaAbk
      // ✅ Ensure kegiatanFisik is populated from root (transformer) or meta
      kegiatanFisik: initialData.kegiatanFisik || meta.kegiatanFisik || {},
    };
  }, [initialData]);

  const { formData, handleChange, handleBulkUpdate, errors, validate } =
    useDataInput(config, normalizedInitialData);

  const [wilayah, setWilayah] = useState(null);
  const [loadingWilayah, setLoadingWilayah] = useState(false);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaOptions, setDesaOptions] = useState([]);

  useEffect(() => {
    const loadWilayah = async () => {
      try {
        setLoadingWilayah(true);
        const res = await fetch("/data/desa-garut.json");
        if (!res.ok) throw new Error("Gagal memuat data wilayah");
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
        console.error("Error wilayah:", err);
        setWilayah(null);
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

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSmp = schoolType === "SMP";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";
  const isPkbm = schoolType === "PKBM";

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

  const sumSiswa = (genderKey) => {
    if (config.isPkbm && config.pakets) {
      return Object.entries(config.pakets).reduce(
        (total, [paketKey, paket]) => {
          const grades = Array.isArray(paket?.grades) ? paket.grades : [];
          return (
            total +
            grades.reduce((t, grade) => {
              const val = getValue(
                formData,
                `siswa.paket${paketKey}.kelas${grade}.${genderKey}`
              );
              return t + (Number(val) || 0);
            }, 0)
          );
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
    if (config.grades?.length > 0) {
      return config.grades.reduce((total, grade) => {
        const val = getValue(formData, `siswa.kelas${grade}.${genderKey}`);
        return total + (Number(val) || 0);
      }, 0);
    }
    return 0;
  };

  const totalSiswaComputed = useMemo(
    () => sumSiswa("l") + sumSiswa("p"),
    [formData, config, activePaudRombelTypes]
  );

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
    if (config.isPkbm && config.pakets) {
      Object.entries(config.pakets).forEach(([paketKey, paket]) => {
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        meta.rombel[`paket${paketKey}`] = {};
        grades.forEach((grade) => {
          const val = getValue(
            formData,
            `rombel.paket${paketKey}.kelas${grade}`
          );
          meta.rombel[`paket${paketKey}`][`kelas${grade}`] = Number(val) || 0;
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
    if (config.grades?.length > 0) {
      config.grades.forEach((grade) => {
        const val = getValue(formData, `rombel.kelas${grade}`);
        meta.rombel[`kelas${grade}`] = Number(val) || 0;
      });
    }
    return meta;
  };

  const buildSiswaMeta = () => {
    const metaSiswa = {};
    if (config.isPkbm && config.pakets) {
      Object.entries(config.pakets).forEach(([paketKey, paket]) => {
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        metaSiswa[`paket${paketKey}`] = {};
        grades.forEach((grade) => {
          const l = getValue(
            formData,
            `siswa.paket${paketKey}.kelas${grade}.l`
          );
          const p = getValue(
            formData,
            `siswa.paket${paketKey}.kelas${grade}.p`
          );
          metaSiswa[`paket${paketKey}`][`kelas${grade}`] = {
            l: toNum(l),
            p: toNum(p),
          };
        });
      });
      return { siswa: metaSiswa };
    }
    if (config.isPaud && activePaudRombelTypes.length > 0) {
      activePaudRombelTypes.forEach((type) => {
        const l = getValue(formData, `siswa.${type.key}.l`);
        const p = getValue(formData, `siswa.${type.key}.p`);
        metaSiswa[type.key] = { l: toNum(l), p: toNum(p) };
      });
      return { siswa: metaSiswa };
    }
    if (config.grades?.length > 0) {
      config.grades.forEach((grade) => {
        const l = getValue(formData, `siswa.kelas${grade}.l`);
        const p = getValue(formData, `siswa.kelas${grade}.p`);
        metaSiswa[`kelas${grade}`] = { l: toNum(l), p: toNum(p) };
      });
    }
    return { siswa: metaSiswa };
  };

  // ✅ HELPER BARU UNTUK ABK (EDIT MODE)
  const buildSiswaAbkMeta = () => {
    const metaSiswaAbk = {};
    if (config.isPkbm && config.pakets) {
      Object.entries(config.pakets).forEach(([paketKey, paket]) => {
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        metaSiswaAbk[`paket${paketKey}`] = {};
        grades.forEach((grade) => {
          const l = getValue(
            formData,
            `siswaAbk.paket${paketKey}.kelas${grade}.l`
          );
          const p = getValue(
            formData,
            `siswaAbk.paket${paketKey}.kelas${grade}.p`
          );
          metaSiswaAbk[`paket${paketKey}`][`kelas${grade}`] = {
            l: toNum(l),
            p: toNum(p),
          };
        });
      });
      return { siswaAbk: metaSiswaAbk };
    }
    if (config.isPaud && activePaudRombelTypes.length > 0) {
      activePaudRombelTypes.forEach((type) => {
        const l = getValue(formData, `siswaAbk.${type.key}.l`);
        const p = getValue(formData, `siswaAbk.${type.key}.p`);
        metaSiswaAbk[type.key] = { l: toNum(l), p: toNum(p) };
      });
      return { siswaAbk: metaSiswaAbk };
    }
    if (config.grades?.length > 0) {
      config.grades.forEach((grade) => {
        const l = getValue(formData, `siswaAbk.kelas${grade}.l`);
        const p = getValue(formData, `siswaAbk.kelas${grade}.p`);
        metaSiswaAbk[`kelas${grade}`] = { l: toNum(l), p: toNum(p) };
      });
    }
    return { siswaAbk: metaSiswaAbk };
  };

  const buildClassesArray = () => {
    const classes = [];
    if ((config.isPaud || isPaud) && activePaudRombelTypes.length > 0) {
      activePaudRombelTypes.forEach((type) => {
        const male = Number(getValue(formData, `siswa.${type.key}.l`) || 0);
        const female = Number(getValue(formData, `siswa.${type.key}.p`) || 0);
        if (male > 0)
          classes.push({ grade: `${type.key}_L`, count: male, extra: null });
        if (female > 0)
          classes.push({ grade: `${type.key}_P`, count: female, extra: null });
      });
      return classes;
    }
    if (config.isPkbm && config.pakets) {
      Object.entries(config.pakets).forEach(([paketKey, paket]) => {
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        grades.forEach((grade) => {
          const base = `siswa.paket${paketKey}.kelas${grade}`;
          const male = Number(getValue(formData, `${base}.l`) || 0);
          const female = Number(getValue(formData, `${base}.p`) || 0);
          if (male > 0)
            classes.push({
              grade: `paket${paketKey}_kelas${grade}_L`,
              count: male,
              extra: null,
            });
          if (female > 0)
            classes.push({
              grade: `paket${paketKey}_kelas${grade}_P`,
              count: female,
              extra: null,
            });
        });
      });
      return classes;
    }
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
    return {
      jumlahGuru:
        pns + pppk + pppkParuhWaktu + nonAsnDapodik + nonAsnTidakDapodik,
      pns,
      pppk,
      pppkParuhWaktu,
      nonAsnDapodik,
      nonAsnTidakDapodik,
      kekuranganGuru: toNum(g.kekuranganGuru),
    };
  };

  const buildStaffSummaryPayload = (guruMeta) => {
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
      { role: "guru_total", count: guruMeta.jumlahGuru, details: null },
    ];
  };

  const buildLanjutPayload = () => {
    if (isPkbm) {
      const get = (p) => getValue(formData, p) || {};
      return {
        lulusanPaketA: {
          smp: toNum(get("lanjut.paketA").smp),
          mts: toNum(get("lanjut.paketA").mts),
          pontren: toNum(get("lanjut.paketA").pontren),
          paketB: toNum(get("lanjut.paketA").paketB),
        },
        lulusanPaketB: {
          sma: toNum(get("lanjut.paketB").sma),
          smk: toNum(get("lanjut.paketB").smk),
          ma: toNum(get("lanjut.paketB").ma),
          pontren: toNum(get("lanjut.paketB").pontren),
          paketC: toNum(get("lanjut.paketB").paketC),
        },
        lulusanPaketC: {
          pt: toNum(get("lanjut.paketC").pt),
          bekerja: toNum(get("lanjut.paketC").bekerja),
        },
      };
    }
    return {
      siswaLanjutDalamKab: Object.fromEntries(
        (LANJUT_OPTIONS[schoolType]?.dalamKab || []).map((o) => [
          o.key,
          toNum(getValue(formData, `lanjut.dalamKab.${o.key}`)),
        ])
      ),
      siswaLanjutLuarKab: Object.fromEntries(
        (LANJUT_OPTIONS[schoolType]?.luarKab || []).map((o) => [
          o.key,
          toNum(getValue(formData, `lanjut.luarKab.${o.key}`)),
        ])
      ),
      siswaTidakLanjut: toNum(getValue(formData, "lanjut.tidakLanjut")),
      siswaBekerja: toNum(getValue(formData, "lanjut.bekerja")),
    };
  };

  const buildPrasaranaPayload = () => {
    const pr = getValue(formData, "prasarana") || {};
    const kg = getValue(formData, "kegiatanFisik") || {};
    const normT = (x) => ({
      total: toNum(x?.total),
      good: toNum(x?.good),
      moderate_damage: toNum(x?.moderate_damage),
      heavy_damage: toNum(x?.heavy_damage),
    });

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

    const lahanVal =
      getValue(formData, "prasarana.classrooms.lahan") ||
      getValue(formData, "prasarana.ruangKelas.lahan") ||
      "";

    return {
      prasarana: {
        ukuran: {
          tanah: toNum(pr?.ukuran?.tanah),
          bangunan: toNum(pr?.ukuran?.bangunan),
          halaman: toNum(pr?.ukuran?.halaman),
        },
        gedung: { jumlah: toNum(pr?.gedung?.jumlah) },
        classrooms: {
          total_room: toNum(pr.classrooms?.total_room),
          classrooms_good: toNum(pr.classrooms?.classrooms_good),
          rusakRingan: toNum(pr.classrooms?.rusakRingan),
          classrooms_moderate_damage: toNum(
            pr.classrooms?.classrooms_moderate_damage
          ),
          heavy_damage: toNum(pr.classrooms?.heavy_damage),
          rusakTotal: toNum(pr.classrooms?.rusakTotal),
          kurangRkb: toNum(pr.classrooms?.kurangRkb),
          kelebihan: toNum(pr.classrooms?.kelebihan),
          rkbTambahan: toNum(pr.classrooms?.rkbTambahan),
          lahan: lahanVal,
        },
        ...labPayload,
        teachers_toilet: {
          male: normT(pr.teachers_toilet?.male),
          female: normT(pr.teachers_toilet?.female),
        },
        students_toilet: {
          male: normT(pr.students_toilet?.male),
          female: normT(pr.students_toilet?.female),
        },
        library: normT(pr.rooms?.library),
        laboratory: normT(pr.rooms?.laboratory),
        teacher_room: normT(pr.rooms?.teacher_room),
        uks_room: normT(pr.rooms?.uks_room),
        toilets: normT(pr.rooms?.toilets),
        official_residences: normT(pr.rooms?.official_residences),
        mebeulair: {
          tables: normT(pr.furniture?.tables),
          chairs: normT(pr.furniture?.chairs),
          computer: toNum(pr.furniture?.computer),
        },
        chromebook: toNum(pr.chromebook),
      },
      // ✅ Payload logic (Include 3 new fields + rehabRuangKelas if exists)
      kegiatanFisik: {
        rehabRuangKelas: toNum(kg.rehabRuangKelas), // 🔥 ITEM BARU DITAMBAHKAN
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

  const handleNext = () => {
    if (validate(sections[currentStep - 1].fields)) {
      setCompletedSteps((prev) => ({ ...prev, [currentStep - 1]: true }));
      if (currentStep < sections.length) setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSave = async () => {
    if (!validate(sections[currentStep - 1].fields)) {
      toast.warning("Mohon lengkapi data di halaman ini terlebih dahulu.");
      return;
    }

    if (!schoolIdFinal) {
      toast.error(
        "Gagal menyimpan: ID Sekolah tidak terdeteksi. Silakan muat ulang halaman."
      );
      return;
    }

    setSaving(true);
    try {
      const kecOpt = kecamatanOptions.find(
        (o) => String(o.value) === String(formData.kecamatan_code)
      );
      const desaOpt = desaOptions.find(
        (o) => String(o.value) === String(formData.desa_code)
      );
      const location = {
        province: "Jawa Barat",
        district: "Garut",
        subdistrict: formData.kecamatan || kecOpt?.label || "",
        village: formData.desa || desaOpt?.label || "",
        extra: {
          address_detail: formData.alamat || "",
          latitude: formData.latitude ? Number(formData.latitude) : null,
          longitude: formData.longitude ? Number(formData.longitude) : null,
          kecamatan_code: formData.kecamatan_code || null,
          desa_code: formData.desa_code || null,
        },
      };

      const guruMeta = normalizeGuru();
      const metaLama = initialData?.__metaRaw || {};

      const school = {
        npsn: formData.npsn,
        name: formData.namaSekolah,
        address: formData.alamat || "",
        village_name: formData.desa || desaOpt?.label || "",
        // ✅ FIX PENTING: Update kolom kecamatan & desa di ROOT payload agar dibaca oleh RPC baru
        kecamatan: formData.kecamatan || kecOpt?.label || "",

        school_type_id: config.schoolTypeId ?? null,
        status: normalizeStatus(formData.status),
        student_count: totalSiswaComputed,
        st_male: sumSiswa("l"),
        st_female: sumSiswa("p"),
        lat: formData.latitude ? Number(formData.latitude) : null,
        lng: formData.longitude ? Number(formData.longitude) : null,
        facilities: null,
        class_condition: null,
        meta: {
          ...metaLama,
          ...buildSiswaMeta(),
          ...buildSiswaAbkMeta(), // ✅ INCLUDE DATA ABK
          ...buildRombelMeta(),
          ...buildLanjutPayload(),
          ...buildPrasaranaPayload(),
          ...buildKelembagaanPayload(), // ✅ PAYLOAD KELEMBAGAAN AMAN
          kecamatan: formData.kecamatan || kecOpt?.label || "",
          desa: formData.desa || desaOpt?.label || "",
          kecamatan_code: formData.kecamatan_code || null,
          desa_code: formData.desa_code || null,
          alamat: formData.alamat || "",
          is_paud: config.isPaud || false,
          monthly_report_file: formData.monthly_report_file || null,
          bantuan_received: formData.bantuan_received || "",
          guru: guruMeta,
          is_test: formData.is_test ?? false,
          jenjang: schoolType,
        },
        contact: {
          operator_name: formData.namaOperator || "",
          operator_phone: formData.hp || "",
        },
      };

      const payload = {
        location,
        school,
        classes: buildClassesArray(),
        staff_summary: buildStaffSummaryPayload(guruMeta),
      };

      const { error } = await supabase.rpc("update_school_with_relations", {
        p_school_id: schoolIdFinal,
        p_payload: payload,
      });

      if (error) throw new Error(error.message || "Gagal update data sekolah");

      toast.success("Data berhasil diperbarui!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSelected = (lat, lng) => {
    handleChange("latitude", lat);
    handleChange("longitude", lng);
    setShowMap(false);
  };

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
            <ReadOnlyField label="NPSN" value={formData.npsn} mono />
            <SelectInput
              label="Status Sekolah"
              value={normalizeStatus(formData.status)}
              onChange={(v) => handleChange("status", v)}
              error={errors.status}
              options={STATUS_OPTIONS}
              placeholder="Pilih Status..."
            />
            <SelectInput
              label="Kecamatan"
              value={formData.kecamatan_code || ""}
              onChange={(k) => {
                const opt = kecamatanOptions.find(
                  (o) => String(o.value) === String(k)
                );
                handleChange("kecamatan_code", k);
                handleChange("kecamatan", opt?.label || "");
                handleChange("desa_code", "");
                handleChange("desa", "");
              }}
              error={errors.kecamatan_code}
              options={kecamatanOptions}
              placeholder={loadingWilayah ? "Memuat..." : "Pilih Kecamatan..."}
              disabled={loadingWilayah || !kecamatanOptions.length}
            />
            <div className="space-y-1">
              <SelectInput
                label="Desa/Kelurahan"
                value={formData.desa_code || ""}
                onChange={(k) => {
                  const opt = desaOptions.find(
                    (o) => String(o.value) === String(k)
                  );
                  handleChange("desa_code", k);
                  handleChange("desa", opt?.label || "");
                }}
                error={errors.desa_code}
                options={desaOptions}
                placeholder={
                  formData.kecamatan_code
                    ? "Pilih Desa..."
                    : "Pilih Kecamatan dulu..."
                }
                disabled={
                  !formData.kecamatan_code ||
                  loadingWilayah ||
                  !desaOptions.length
                }
              />
              {formData.kecamatan_code &&
                !loadingWilayah &&
                !desaOptions.length && (
                  <p className="text-xs text-muted-foreground">
                    Data desa tidak ditemukan.
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
                className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Pilih Koordinat di Map
              </button>
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

            {/* Bagian Siswa Reguler */}
            {config.isPkbm && config.pakets ? (
              <div className="space-y-4">
                {Object.entries(config.pakets).map(([pk, p]) => (
                  <div
                    key={pk}
                    className="p-4 border rounded-lg bg-gray-50/50 space-y-4"
                  >
                    <p className="font-medium">{p?.name || `paket${pk}`}</p>
                    {(p.grades || []).map((g) => (
                      <div
                        key={`${pk}-${g}`}
                        className="grid grid-cols-2 gap-4"
                      >
                        <NumberInput
                          label={`Kelas ${g} - L`}
                          value={getValue(
                            formData,
                            `siswa.paket${pk}.kelas${g}.l`
                          )}
                          onChange={(v) =>
                            handleChange(`siswa.paket${pk}.kelas${g}.l`, v)
                          }
                        />
                        <NumberInput
                          label={`Kelas ${g} - P`}
                          value={getValue(
                            formData,
                            `siswa.paket${pk}.kelas${g}.p`
                          )}
                          onChange={(v) =>
                            handleChange(`siswa.paket${pk}.kelas${g}.p`, v)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {config.grades?.map((g) => (
                  <div key={g} className="p-4 border rounded-lg bg-gray-50/50">
                    <p className="font-medium mb-3">Kelas {g}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Laki-laki"
                        value={getValue(formData, `siswa.kelas${g}.l`)}
                        onChange={(v) => handleChange(`siswa.kelas${g}.l`, v)}
                      />
                      <NumberInput
                        label="Perempuan"
                        value={getValue(formData, `siswa.kelas${g}.p`)}
                        onChange={(v) => handleChange(`siswa.kelas${g}.p`, v)}
                      />
                    </div>
                  </div>
                ))}
                {config.isPaud &&
                  activePaudRombelTypes.map((t) => (
                    <div
                      key={t.key}
                      className="p-4 border rounded-lg bg-gray-50/50"
                    >
                      <p className="font-medium mb-3">{t.label}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                          label="Laki-laki"
                          value={getValue(formData, `siswa.${t.key}.l`)}
                          onChange={(v) => handleChange(`siswa.${t.key}.l`, v)}
                        />
                        <NumberInput
                          label="Perempuan"
                          value={getValue(formData, `siswa.${t.key}.p`)}
                          onChange={(v) => handleChange(`siswa.${t.key}.p`, v)}
                        />
                      </div>
                    </div>
                  ))}
              </>
            )}

            {/* ✅ SECTION BARU: Siswa Berkebutuhan Khusus (ABK) */}
            <h3 className="font-bold text-lg mt-8 mb-4 border-b pb-2">
              Data Siswa Berkebutuhan Khusus (ABK)
            </h3>
            {config.isPkbm && config.pakets ? (
              <div className="space-y-4">
                {Object.entries(config.pakets).map(([pk, p]) => (
                  <div
                    key={`abk-${pk}`}
                    className="p-4 border rounded-lg bg-orange-50/50 space-y-4"
                  >
                    <p className="font-medium">
                      ABK - {p?.name || `paket${pk}`}
                    </p>
                    {(p.grades || []).map((g) => (
                      <div
                        key={`abk-${pk}-${g}`}
                        className="grid grid-cols-2 gap-4"
                      >
                        <NumberInput
                          label={`Kelas ${g} - L (ABK)`}
                          value={getValue(
                            formData,
                            `siswaAbk.paket${pk}.kelas${g}.l`
                          )}
                          onChange={(v) =>
                            handleChange(`siswaAbk.paket${pk}.kelas${g}.l`, v)
                          }
                        />
                        <NumberInput
                          label={`Kelas ${g} - P (ABK)`}
                          value={getValue(
                            formData,
                            `siswaAbk.paket${pk}.kelas${g}.p`
                          )}
                          onChange={(v) =>
                            handleChange(`siswaAbk.paket${pk}.kelas${g}.p`, v)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {config.grades?.map((g) => (
                  <div
                    key={`abk-kelas${g}`}
                    className="p-4 border rounded-lg bg-orange-50/50"
                  >
                    <p className="font-medium mb-3">ABK - Kelas {g}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Laki-laki (ABK)"
                        value={getValue(formData, `siswaAbk.kelas${g}.l`)}
                        onChange={(v) =>
                          handleChange(`siswaAbk.kelas${g}.l`, v)
                        }
                      />
                      <NumberInput
                        label="Perempuan (ABK)"
                        value={getValue(formData, `siswaAbk.kelas${g}.p`)}
                        onChange={(v) =>
                          handleChange(`siswaAbk.kelas${g}.p`, v)
                        }
                      />
                    </div>
                  </div>
                ))}
                {config.isPaud &&
                  activePaudRombelTypes.map((t) => (
                    <div
                      key={`abk-${t.key}`}
                      className="p-4 border rounded-lg bg-orange-50/50"
                    >
                      <p className="font-medium mb-3">ABK - {t.label}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                          label="Laki-laki (ABK)"
                          value={getValue(formData, `siswaAbk.${t.key}.l`)}
                          onChange={(v) =>
                            handleChange(`siswaAbk.${t.key}.l`, v)
                          }
                        />
                        <NumberInput
                          label="Perempuan (ABK)"
                          value={getValue(formData, `siswaAbk.${t.key}.p`)}
                          onChange={(v) =>
                            handleChange(`siswaAbk.${t.key}.p`, v)
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
        return (
          <div className="space-y-4">
            {config.isPkbm && config.pakets ? (
              Object.entries(config.pakets).map(([pk, p]) => (
                <div key={pk} className="p-4 border rounded-lg bg-gray-50/50">
                  <p className="font-medium mb-3">{p?.name}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(p.grades || []).map((g) => (
                      <NumberInput
                        key={g}
                        label={`Rombel Kls ${g}`}
                        value={getValue(
                          formData,
                          `rombel.paket${pk}.kelas${g}`
                        )}
                        onChange={(v) =>
                          handleChange(`rombel.paket${pk}.kelas${g}`, v)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : config.isPaud ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {activePaudRombelTypes.map((t) => (
                  <NumberInput
                    key={t.key}
                    label={`Rombel ${t.label}`}
                    value={getValue(formData, `rombel.${t.key}`)}
                    onChange={(v) => handleChange(`rombel.${t.key}`, v)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {config.grades?.map((g) => (
                  <NumberInput
                    key={g}
                    label={`Rombel Kls ${g}`}
                    value={getValue(formData, `rombel.kelas${g}`)}
                    onChange={(v) => handleChange(`rombel.kelas${g}`, v)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "lanjut":
        if (!LANJUT_OPTIONS[schoolType]) return <p>Tidak berlaku.</p>;
        const opt = LANJUT_OPTIONS[schoolType];
        if (isPkbm) {
          const grps = [
            { k: "paketA", l: "Lulusan Paket A" },
            { k: "paketB", l: "Lulusan Paket B" },
            { k: "paketC", l: "Lulusan Paket C" },
          ];
          return (
            <div className="space-y-6">
              {grps.map((g) => (
                <div key={g.k} className="p-4 border rounded-lg bg-gray-50/50">
                  <p className="font-medium mb-3">{g.l}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(opt[g.k] || []).map((o) => (
                      <NumberInput
                        key={o.key}
                        label={o.label}
                        value={getValue(formData, `lanjut.${g.k}.${o.key}`)}
                        onChange={(v) =>
                          handleChange(`lanjut.${g.k}.${o.key}`, v)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Dalam Kabupaten</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(opt.dalamKab || []).map((o) => (
                  <NumberInput
                    key={o.key}
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
              <p className="font-medium mb-3">Luar Kabupaten</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(opt.luarKab || []).map((o) => (
                  <NumberInput
                    key={o.key}
                    label={o.label}
                    value={getValue(formData, `lanjut.luarKab.${o.key}`)}
                    onChange={(v) => handleChange(`lanjut.luarKab.${o.key}`, v)}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Lainnya</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Tidak Lanjut"
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
      case "prasarana":
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Ukuran & Gedung</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Tanah (m²)"
                  value={getValue(formData, "prasarana.ukuran.tanah")}
                  onChange={(v) => handleChange("prasarana.ukuran.tanah", v)}
                />
                <NumberInput
                  label="Bangunan (m²)"
                  value={getValue(formData, "prasarana.ukuran.bangunan")}
                  onChange={(v) => handleChange("prasarana.ukuran.bangunan", v)}
                />
                <NumberInput
                  label="Halaman (m²)"
                  value={getValue(formData, "prasarana.ukuran.halaman")}
                  onChange={(v) => handleChange("prasarana.ukuran.halaman", v)}
                />
                <NumberInput
                  label="Jml Gedung"
                  value={getValue(formData, "prasarana.gedung.jumlah")}
                  onChange={(v) => handleChange("prasarana.gedung.jumlah", v)}
                />
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Kondisi Ruang Kelas</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  "total_room",
                  "classrooms_good",
                  "rusakRingan",
                  "classrooms_moderate_damage",
                  "heavy_damage",
                  "rusakTotal",
                ].map((k) => (
                  <NumberInput
                    key={k}
                    label={k.replace(/_/g, " ").replace("classrooms ", "")}
                    value={getValue(formData, `prasarana.classrooms.${k}`)}
                    onChange={(v) =>
                      handleChange(`prasarana.classrooms.${k}`, v)
                    }
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {["kurangRkb", "kelebihan", "rkbTambahan"].map((k) => (
                  <NumberInput
                    key={k}
                    label={k}
                    value={getValue(formData, `prasarana.classrooms.${k}`)}
                    onChange={(v) =>
                      handleChange(`prasarana.classrooms.${k}`, v)
                    }
                  />
                ))}
                <SelectInput
                  label="Lahan"
                  value={getValue(formData, "prasarana.classrooms.lahan") || ""}
                  onChange={(v) =>
                    handleChange("prasarana.classrooms.lahan", v)
                  }
                  options={LAHAN_OPTIONS}
                  placeholder="Pilih..."
                />
              </div>
            </div>
            {isSmp && (
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Laboratorium SMP</p>
                <div className="space-y-4">
                  {[
                    { k: "laboratory_comp", l: "Komputer" },
                    { k: "laboratory_langua", l: "Bahasa" },
                    { k: "laboratory_ipa", l: "IPA" },
                    { k: "laboratory_fisika", l: "Fisika" },
                    { k: "laboratory_biologi", l: "Biologi" },
                  ].map((lb) => (
                    <div key={lb.k} className="p-3 border rounded-lg bg-white">
                      <p className="font-medium mb-2">{lb.l}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          "total_all",
                          "good",
                          "moderate_damage",
                          "heavy_damage",
                        ].map((stat) => (
                          <NumberInput
                            key={stat}
                            label={stat.replace("_", " ")}
                            value={getValue(
                              formData,
                              `prasarana.labs.${lb.k}.${stat}`
                            )}
                            onChange={(v) =>
                              handleChange(`prasarana.labs.${lb.k}.${stat}`, v)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail Toilet SMP */}
            {isSmp && (
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Detail Toilet (SMP)</p>
                <div className="space-y-4">
                  {[
                    {
                      label: "Toilet Guru (Laki-laki)",
                      path: "teachers_toilet.male",
                    },
                    {
                      label: "Toilet Guru (Perempuan)",
                      path: "teachers_toilet.female",
                    },
                    {
                      label: "Toilet Siswa (Laki-laki)",
                      path: "students_toilet.male",
                    },
                    {
                      label: "Toilet Siswa (Perempuan)",
                      path: "students_toilet.female",
                    },
                  ].map((item) => (
                    <div
                      key={item.path}
                      className="p-3 border rounded-lg bg-white"
                    >
                      <p className="font-medium mb-2">{item.label}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <NumberInput
                          label="Total"
                          value={getValue(
                            formData,
                            `prasarana.${item.path}.total`
                          )}
                          onChange={(v) =>
                            handleChange(`prasarana.${item.path}.total`, v)
                          }
                        />
                        <NumberInput
                          label="Baik"
                          value={getValue(
                            formData,
                            `prasarana.${item.path}.good`
                          )}
                          onChange={(v) =>
                            handleChange(`prasarana.${item.path}.good`, v)
                          }
                        />
                        <NumberInput
                          label="R. Sedang"
                          value={getValue(
                            formData,
                            `prasarana.${item.path}.moderate_damage`
                          )}
                          onChange={(v) =>
                            handleChange(
                              `prasarana.${item.path}.moderate_damage`,
                              v
                            )
                          }
                        />
                        <NumberInput
                          label="R. Berat"
                          value={getValue(
                            formData,
                            `prasarana.${item.path}.heavy_damage`
                          )}
                          onChange={(v) =>
                            handleChange(
                              `prasarana.${item.path}.heavy_damage`,
                              v
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Ruangan Lainnya</p>
              <div className="space-y-4">
                {[
                  { k: "library", l: "Perpus" },
                  // ✅ LOGIC BARU: Lab Umum hanya muncul jika BUKAN SMP dan BUKAN PAUD (Artinya: SD & PKBM)
                  ...(!isSmp && !isPaud
                    ? [{ k: "laboratory", l: "Lab Umum" }]
                    : []),
                  { k: "teacher_room", l: "R. Guru" },
                  { k: "uks_room", l: "UKS" },
                  // Sembunyikan Toilet Umum jika SMP (karena sudah ada detail di atas)
                  ...(!isSmp ? [{ k: "toilets", l: "Toilet" }] : []),
                  { k: "official_residences", l: "Rumah Dinas" },
                ].map((r) => (
                  <div
                    key={r.k}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    <NumberInput
                      label={`${r.l} Total`}
                      value={getValue(formData, `prasarana.rooms.${r.k}.total`)}
                      onChange={(v) =>
                        handleChange(`prasarana.rooms.${r.k}.total`, v)
                      }
                    />
                    <NumberInput
                      label="Baik"
                      value={getValue(formData, `prasarana.rooms.${r.k}.good`)}
                      onChange={(v) =>
                        handleChange(`prasarana.rooms.${r.k}.good`, v)
                      }
                    />
                    <NumberInput
                      label="R. Sedang"
                      value={getValue(
                        formData,
                        `prasarana.rooms.${r.k}.moderate_damage`
                      )}
                      onChange={(v) =>
                        handleChange(
                          `prasarana.rooms.${r.k}.moderate_damage`,
                          v
                        )
                      }
                    />
                    <NumberInput
                      label="R. Berat"
                      value={getValue(
                        formData,
                        `prasarana.rooms.${r.k}.heavy_damage`
                      )}
                      onChange={(v) =>
                        handleChange(`prasarana.rooms.${r.k}.heavy_damage`, v)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Mebeulair</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {["tables", "chairs"].map((i) =>
                  ["total", "good", "moderate_damage", "heavy_damage"].map(
                    (s) => (
                      <NumberInput
                        key={`${i}-${s}`}
                        label={`${i} ${s}`}
                        value={getValue(
                          formData,
                          `prasarana.furniture.${i}.${s}`
                        )}
                        onChange={(v) =>
                          handleChange(`prasarana.furniture.${i}.${s}`, v)
                        }
                      />
                    )
                  )
                )}
                <NumberInput
                  label="Komputer"
                  value={getValue(formData, "prasarana.furniture.computer")}
                  onChange={(v) =>
                    handleChange("prasarana.furniture.computer", v)
                  }
                />
                <NumberInput
                  label="Chromebook"
                  value={getValue(formData, "prasarana.chromebook")}
                  onChange={(v) => handleChange("prasarana.chromebook", v)}
                />
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Rencana Kegiatan Fisik</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
      case "kelembagaan":
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50/50">
              <p className="font-medium mb-3">Status</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectInput
                  label="Alat Rumah Tangga"
                  value={normalizePeralatanRumahTangga(
                    getValue(formData, "kelembagaan.peralatanRumahTangga")
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
                    getValue(formData, "kelembagaan.pembinaan")
                  )}
                  onChange={(v) => handleChange("kelembagaan.pembinaan", v)}
                  options={SUDAH_BELUM_OPTIONS}
                  placeholder="Pilih..."
                />
                <SelectInput
                  label="Asesmen"
                  value={normalizeSudahBelum(
                    getValue(formData, "kelembagaan.asesmen")
                  )}
                  onChange={(v) => handleChange("kelembagaan.asesmen", v)}
                  options={SUDAH_BELUM_OPTIONS}
                  placeholder="Pilih..."
                />
                {[
                  "menyelenggarakanBelajar",
                  "melaksanakanRekomendasi",
                  "siapDievaluasi",
                ].map((k) => (
                  <SelectInput
                    key={k}
                    label={k.replace(/([A-Z])/g, " $1").trim()}
                    value={getValue(formData, `kelembagaan.${k}`) || ""}
                    onChange={(v) => handleChange(`kelembagaan.${k}`, v)}
                    options={YESNO_OPTIONS}
                    placeholder="Pilih..."
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">BOP</p>
                <div className="space-y-4">
                  {["pengelola", "tenagaPeningkatan"].map((k) => (
                    <SelectInput
                      key={k}
                      label={k}
                      value={getValue(formData, `kelembagaan.bop.${k}`) || ""}
                      onChange={(v) => handleChange(`kelembagaan.bop.${k}`, v)}
                      options={YESNO_OPTIONS}
                      placeholder="Pilih..."
                    />
                  ))}
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-gray-50/50">
                <p className="font-medium mb-3">Perizinan & Kurikulum</p>
                <div className="space-y-4">
                  <SelectInput
                    label="Izin Pengendalian"
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
                    label="Izin Kelayakan"
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
          </div>
        );
      default:
        return <div>Konten belum tersedia</div>;
    }
  };

  if (!initialData && schoolIdProp) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p>Memuat data sekolah...</p>
      </div>
    );
  }

  if (!schoolIdFinal && initialData) {
    return (
      <div className="max-w-4xl mx-auto p-6 border border-red-200 bg-red-50 rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-700">
          Data Sekolah Tidak Valid
        </h2>
        <p className="text-red-600 mt-2">
          ID Sekolah tidak ditemukan dalam database. Mohon kembali ke dashboard
          dan coba lagi.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "w-full"
          : "max-w-4xl mx-auto p-6 border rounded-lg bg-white shadow-sm"
      }
    >
      {!embedded && (
        <h1 className="text-2xl font-bold mb-6">Edit Data {schoolType}</h1>
      )}

      <ExcelImportButton
        config={config}
        schoolType={schoolType}
        currentFormData={formData}
        onImportSuccess={handleBulkUpdate}
        isEditMode={true} // PENTING: Set true agar validasi NPSN jalan
      />

      <div className="mb-8">
        <Stepper
          sections={sections}
          currentStep={currentStep}
          setStep={setCurrentStep}
          completedSteps={completedSteps}
        />
      </div>
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali
        </button>
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
                disabled={saving || !schoolIdFinal}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}{" "}
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
