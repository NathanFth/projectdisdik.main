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
  // kalau ada input legacy: "NEGERI"/"SWASTA"
  if (s === "negeri".toUpperCase().toLowerCase()) return "NEGERI";
  if (s === "swasta".toUpperCase().toLowerCase()) return "SWASTA";
  return s.toUpperCase();
};

const STATUS_OPTIONS = [
  { value: "NEGERI", label: "Negeri" },
  { value: "SWASTA", label: "Swasta" },
];

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
  // 3) MASTER WILAYAH (Kemendagri) dari: public/data/desa-garut.json
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

  // 6) Sections (info + guru + siswa + rombel)
  const sections = useMemo(
    () => [
      {
        id: "info",
        title: "Info Sekolah",
        icon: <School className="w-5 h-5" />,
        fields: ["namaSekolah", "npsn"], // status & wilayah kita tidak paksa wajib dulu biar fleksibel
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
    ],
    []
  );

  // =========================
  // Helpers
  // =========================
  const sumSiswa = (genderKey) => {
    // ✅ PKBM: paket A/B/C per kelas
    if (config.isPkbm && config.pakets) {
      return Object.entries(config.pakets).reduce(
        (total, [paketKey, paket]) => {
          const paketName = `paket${paketKey}`; // paketA / paketB / paketC
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

  // =========================
  // Guru: jumlah otomatis dari rincian
  // =========================
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

    // ✅ PKBM: rombel per paket & kelas
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

    // ✅ PKBM: classes per paket & kelas (L/P)
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

    // PAUD/TK: bisa dibuat juga classes (opsional), tapi sekarang tetap pakai pola existing
    if (!config.grades) return classes;

    config.grades.forEach((grade) => {
      const male = Number(getValue(formData, `siswa.kelas${grade}.l`) || 0);
      const female = Number(getValue(formData, `siswa.kelas${grade}.p`) || 0);

      if (male > 0)
        classes.push({ grade: `kelas${grade}_L`, count: male, extra: null });
      if (female > 0)
        classes.push({ grade: `kelas${grade}_P`, count: female, extra: null });
    });

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

    // SELALU kirim role-role ini (meski 0) supaya RPC bisa delete stale rows
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
          jenjang: schoolType,
          is_test: formData.is_test ?? false,
        },
        contact: {
          operator_name: formData.namaOperator || "",
          operator_phone: formData.hp || "",
        },
      };

      const payload = { location, school, classes, staff_summary };

      console.log("[PKBM DEBUG] schoolType:", schoolType);
      console.log("[PKBM DEBUG] config:", config);
      console.log("[PKBM DEBUG] formData:", formData);
      console.log("[PKBM DEBUG] rombelMeta:", rombelMeta);
      console.log("[PKBM DEBUG] classes:", classes);
      console.log(
        "[PKBM DEBUG] totalMale,totalFemale:",
        totalMale,
        totalFemale
      );

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

            {/* ✅ PKBM */}
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
        // ✅ PKBM
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
