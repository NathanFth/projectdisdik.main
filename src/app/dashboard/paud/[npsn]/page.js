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

// Helper untuk mengambil value dari object bertingkat
const getValue = (obj, path) =>
  path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

export default function DataInputForm({ schoolType, embedded = false }) {
  const router = useRouter();

  // 1. Config & Initial Data
  const config = useMemo(
    () => schoolConfigs[schoolType] || schoolConfigs.default,
    [schoolType]
  );
  const initialData = useMemo(() => createInitialFormData(config), [config]);

  // 2. Hook Form Data
  const { formData, handleChange, errors, validate } = useDataInput(
    config,
    initialData
  );

  // 3. KECAMATAN OPTIONS dari JSON (public/data/kecamatan-garut.json)
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [loadingKecamatan, setLoadingKecamatan] = useState(false);

  useEffect(() => {
    const loadKecamatan = async () => {
      try {
        setLoadingKecamatan(true);
        const res = await fetch("/data/kecamatan-garut.json");
        if (!res.ok) {
          throw new Error("Gagal memuat data kecamatan");
        }
        const data = await res.json();

        const options = (Array.isArray(data) ? data : []).map((nama) => ({
          value: nama,
          label: nama,
        }));

        setKecamatanOptions(options);
      } catch (err) {
        console.error("Error memuat kecamatan:", err);
      } finally {
        setLoadingKecamatan(false);
      }
    };

    loadKecamatan();
  }, []);

  // Khusus TK/PAUD: pilih jenis rombel aktif berdasarkan schoolType
  const activePaudRombelTypes = useMemo(() => {
    if (!config.isPaud || !config.rombelTypes) return [];

    if (schoolType === "TK") {
      // Hanya TK A & TK B
      return config.rombelTypes.filter(
        (t) => t.key === "tka" || t.key === "tkb"
      );
    }

    if (schoolType === "PAUD") {
      // Hanya KB & SPS/TPA
      return config.rombelTypes.filter(
        (t) => t.key === "kb" || t.key === "sps_tpa"
      );
    }

    // Fallback jika nanti ada type lain yang juga isPaud
    return config.rombelTypes;
  }, [config, schoolType]);

  // 4. Local State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  // 5. Definisi Section
  const sections = useMemo(
    () => [
      {
        id: "info",
        title: "Info Sekolah",
        icon: <School className="w-5 h-5" />,
        fields: ["namaSekolah", "npsn", "kecamatan", "desa", "alamat"],
      },
      {
        id: "siswa",
        title: "Data Siswa",
        icon: <Users className="w-5 h-5" />,
        fields: [], // validasi per-field nanti bisa ditambah
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

  // --- LOGIC HELPERS ---

  const sumSiswa = (genderKey) => {
    // TK/PAUD: gunakan rombelTypes aktif (TK A/B atau KB/SPS/TPA)
    if (config.isPaud && activePaudRombelTypes.length > 0) {
      return activePaudRombelTypes.reduce((total, type) => {
        const val = getValue(formData, `siswa.${type.key}.${genderKey}`);
        return total + (Number(val) || 0);
      }, 0);
    }

    // Sekolah lain: gunakan grades (kelas 1,2,dst)
    if (config.grades && config.grades.length > 0) {
      return config.grades.reduce((total, grade) => {
        const val = getValue(formData, `siswa.kelas${grade}.${genderKey}`);
        return total + (Number(val) || 0);
      }, 0);
    }

    return 0;
  };

  const buildRombelMeta = () => {
    const meta = { rombel: {} };

    // TK/PAUD: rombel berdasarkan rombelTypes aktif
    if (config.isPaud && activePaudRombelTypes.length > 0) {
      activePaudRombelTypes.forEach((type) => {
        const val = getValue(formData, `rombel.${type.key}`);
        meta.rombel[type.key] = Number(val) || 0;
      });
      return meta;
    }

    // Sekolah lain: rombel per kelas
    if (config.grades && config.grades.length > 0) {
      config.grades.forEach((grade) => {
        const key = `kelas${grade}`;
        const val = getValue(formData, `rombel.${key}`);
        meta.rombel[key] = Number(val) || 0;
      });
    }

    return meta;
  };

  // 🔴 INI BAGIAN PENTING: classes UNTUK PAUD JUGA DIISI
  const buildClassesArray = () => {
    const classes = [];

    // TK/PAUD → simpan per jenis rombel & jenis kelamin
    if (config.isPaud && activePaudRombelTypes.length > 0) {
      activePaudRombelTypes.forEach((type) => {
        const male = Number(getValue(formData, `siswa.${type.key}.l`) || 0);
        const female = Number(getValue(formData, `siswa.${type.key}.p`) || 0);

        if (male > 0) {
          classes.push({
            grade: `${type.key}_L`, // contoh: "kb_L"
            count: male,
            extra: null,
          });
        }

        if (female > 0) {
          classes.push({
            grade: `${type.key}_P`, // contoh: "kb_P"
            count: female,
            extra: null,
          });
        }
      });

      return classes;
    }

    // SD/SMP → simpan per kelas & jenis kelamin
    if (config.grades && config.grades.length > 0) {
      config.grades.forEach((grade) => {
        const male = Number(getValue(formData, `siswa.kelas${grade}.l`) || 0);
        const female = Number(getValue(formData, `siswa.kelas${grade}.p`) || 0);

        if (male > 0) {
          classes.push({
            grade: `kelas${grade}_L`,
            count: male,
            extra: null,
          });
        }

        if (female > 0) {
          classes.push({
            grade: `kelas${grade}_P`,
            count: female,
            extra: null,
          });
        }
      });
    }

    return classes;
  };

  useEffect(() => {
    console.log("config :", config);
  }, [config]);

  // --- HANDLER STEP & SUBMIT ---

  const handleNext = () => {
    const currentFields = sections[currentStep - 1].fields;

    if (validate(currentFields)) {
      setCompletedSteps((prev) => ({ ...prev, [currentStep - 1]: true }));

      if (currentStep < sections.length) {
        setCurrentStep((s) => s + 1);
      }
    } else {
      console.log("Validasi gagal pada step:", currentStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
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

      const locationPayload = {
        province: "Jawa Barat",
        district: "Garut",
        subdistrict: formData.kecamatan,
        village: formData.desa,
        address_detail: formData.alamat || "",
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
      };

      const schoolPayload = {
        npsn: formData.npsn,
        name: formData.namaSekolah,
        address: formData.alamat || "",
        village_name: formData.desa,
        school_type_id: config.schoolTypeId || null,
        status: formData.status || "Swasta",
        student_count: totalMale + totalFemale,
        st_male: totalMale,
        st_female: totalFemale,
        lat: formData.latitude ? Number(formData.latitude) : null,
        lng: formData.longitude ? Number(formData.longitude) : null,
        facilities: null, // nanti bisa diisi dari form prasarana
        class_condition: null, // nanti juga bisa diisi
        meta: {
          ...rombelMeta,
          kecamatan: formData.kecamatan,
          desa: formData.desa,
          alamat: formData.alamat || "",
          is_paud: config.isPaud || false,
        },
        contact: {
          operator_name: formData.namaOperator || "",
          operator_phone: formData.hp || "",
        },
      };

      const payload = {
        school: schoolPayload,
        location: locationPayload,
        classes,
      };

      console.log("Payload yang dikirim:", payload);

      const { data, error } = await supabase.rpc(
        "insert_school_with_relations",
        {
          p_payload: payload,
        }
      );

      if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message || "Gagal menyimpan data");
      }

      console.log("Berhasil disimpan:", data);
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

  // --- RENDER CONTENT ---

  const renderContent = () => {
    const section = sections[currentStep - 1];

    if (!formData) return <div>Loading form data...</div>;

    switch (section.id) {
      case "info":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextInput
              label="Nama Sekolah"
              value={formData.namaSekolah}
              onChange={(v) => handleChange("namaSekolah", v)}
              error={errors.namaSekolah}
              required
            />
            <TextInput
              label="NPSN"
              value={formData.npsn}
              onChange={(v) => handleChange("npsn", v)}
              error={errors.npsn}
              required
            />
            <SelectInput
              label="Kecamatan"
              value={formData.kecamatan}
              onChange={(v) => handleChange("kecamatan", v)}
              error={errors.kecamatan}
              options={kecamatanOptions}
              required
              disabled={loadingKecamatan || kecamatanOptions.length === 0}
            />
            <TextInput
              label="Desa/Kelurahan"
              value={formData.desa}
              onChange={(v) => handleChange("desa", v)}
              error={errors.desa}
              required
            />
            <TextInput
              label="Alamat Lengkap"
              value={formData.alamat}
              onChange={(v) => handleChange("alamat", v)}
              error={errors.alamat}
              required
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Koordinat
              </label>
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Latitude"
                  value={formData.latitude}
                  onChange={(v) => handleChange("latitude", v)}
                  error={errors.latitude}
                  placeholder="-6.9"
                />
                <TextInput
                  label="Longitude"
                  value={formData.longitude}
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
                Anda bisa mengisi koordinat secara manual atau klik tombol di
                atas.
              </p>
            </div>
          </div>
        );

      case "siswa":
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-semibold text-blue-900">
                Total Siswa: {sumSiswa("l") + sumSiswa("p")}
              </h4>
            </div>

            {/* SD/SMP */}
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

            {/* PAUD */}
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
          </div>
        );

      case "rombel":
        // TK/PAUD: rombel per jenis (TK A/B atau KB/SPS/TPA)
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

        // Sekolah lain: rombel per kelas
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-6"
      >
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
                  : [-6.911435926513646, 107.57701686406499]
              }
            />

            <p className="text-xs text-gray-500">
              Setelah memilih titik di peta, nilai latitude &amp; longitude akan
              terisi otomatis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
