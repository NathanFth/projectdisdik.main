// src/app/components/DataInputForm.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  School,
  Users,
  BookOpen,
  Save,
  Loader2,
  User,
  TrendingUp,
  Building,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

import { schoolConfigs } from "@/lib/config/schoolConfig";
// ✅ FIX 1: Gunakan Named Import (pakai kurung kurawal)
import { createInitialFormData } from "@/lib/config/createInitialFormData";

import { useDataInput } from "@/hooks/useDataInput";
import { NumberInput } from "./ui/FormInputs";
import Stepper from "./Stepper";
import { supabase } from "@/lib/supabase/lib/client";

import SchoolInfoSection from "./form-sections/SchoolInfoSection";
import TeacherSection from "./form-sections/TeacherSection";
import StudentSection from "./form-sections/StudentSection";
import InfrastructureSection from "./form-sections/InfrastructureSection";
import KelembagaanSection from "./form-sections/KelembagaanSection";

import {
  LANJUT_OPTIONS,
  getValue,
  sumSiswaByGender,
  normalizeGuruMeta,
  buildInsertSchoolWithRelationsPayload,
} from "@/lib/forms/payloadBuilder";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap.jsx"), {
  ssr: false,
});

export default function DataInputForm({ schoolType, embedded = false }) {
  const router = useRouter();

  // REFACTOR: Satukan TK ke dalam PAUD
  const effectiveSchoolType = schoolType === "TK" ? "PAUD" : schoolType;

  const config = useMemo(
    () => schoolConfigs[effectiveSchoolType] || schoolConfigs.default,
    [effectiveSchoolType],
  );

  const initialData = useMemo(() => createInitialFormData(config), [config]);

  // ✅ FIX 2: Panggil hook dengan Object Argument (sesuai update useDataInput terakhir)
  const { formData, handleChange, handleBulkUpdate, errors, validate } =
    useDataInput({
      config,
      initialData,
      schoolType: effectiveSchoolType,
      isEditMode: true,
    });

  const [wilayah, setWilayah] = useState(null);
  const [loadingWilayah, setLoadingWilayah] = useState(false);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaOptions, setDesaOptions] = useState([]);

  // Fetch Wilayah
  useEffect(() => {
    const loadWilayah = async () => {
      try {
        setLoadingWilayah(true);
        const res = await fetch("/data/desa-garut.json");
        if (!res.ok) throw new Error("Gagal memuat data wilayah");
        const data = await res.json();
        const kecArr = Array.isArray(data?.kecamatan) ? data.kecamatan : [];
        setWilayah(data);
        setKecamatanOptions(
          kecArr
            .map((k) => ({ value: k.kode_kecamatan, label: k.nama_kecamatan }))
            .sort((a, b) => a.label.localeCompare(b.label, "id")),
        );
      } catch (err) {
        console.error(err);
        setWilayah(null);
      } finally {
        setLoadingWilayah(false);
      }
    };
    loadWilayah();
  }, []);

  // Filter Desa based on Kecamatan
  useEffect(() => {
    if (!wilayah?.kecamatan) return;
    const kecCode = formData?.kecamatan_code || "";
    if (!kecCode) {
      setDesaOptions([]);
      return;
    }
    const kec = wilayah.kecamatan.find(
      (k) => String(k.kode_kecamatan) === String(kecCode),
    );
    const desaList = Array.isArray(kec?.desa) ? kec.desa : [];
    setDesaOptions(
      desaList
        .map((d) => ({ value: d.kode_desa, label: d.nama_desa }))
        .sort((a, b) => a.label.localeCompare(b.label, "id")),
    );
  }, [wilayah, formData?.kecamatan_code]);

  const activePaudRombelTypes = useMemo(() => {
    if (!config.isPaud || !config.rombelTypes) return [];
    return config.rombelTypes;
  }, [config]);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPkbm = effectiveSchoolType === "PKBM";

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
    [],
  );

  // Computed Values
  const siswaCounts = useMemo(() => {
    if (!formData) return { male: 0, female: 0, total: 0 };
    const male = sumSiswaByGender({
      formData,
      config,
      activePaudRombelTypes,
      genderKey: "l",
    });

    const female = sumSiswaByGender({
      formData,
      config,
      activePaudRombelTypes,
      genderKey: "p",
    });

    return { male, female, total: male + female };
  }, [formData, config, activePaudRombelTypes]);

  const totalSiswaComputed = siswaCounts.total;

  const guruTotalComputed = useMemo(() => {
    return formData ? normalizeGuruMeta(formData).jumlahGuru : 0;
  }, [formData]);

  // Handlers
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

    setSaving(true);
    try {
      const kecOpt = kecamatanOptions.find(
        (o) => String(o.value) === String(formData.kecamatan_code),
      );
      const desaOpt = desaOptions.find(
        (o) => String(o.value) === String(formData.desa_code),
      );

      const payload = buildInsertSchoolWithRelationsPayload({
        formData,
        config,
        schoolType: effectiveSchoolType,
        kecamatanLabel: kecOpt?.label,
        desaLabel: desaOpt?.label,
      });

      console.log("Payload:", payload);

      const { error } = await supabase.rpc("insert_school_with_relations", {
        p_payload: payload,
      });

      if (error) throw new Error(error.message || "Gagal menyimpan data");

      toast.success("Data berhasil disimpan!");

      // Hapus draft setelah sukses save (Panggil manual via localStorage karena hook ada di dalam)
      if (typeof window !== "undefined") {
        localStorage.removeItem(`draft_form_${effectiveSchoolType}`);
      }

      router.push(`/dashboard/${effectiveSchoolType.toLowerCase()}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSelected = (lat, lng) => {
    handleChange("latitude", lat);
    handleChange("longitude", lng);
    setShowMap(false);
  };

  // Render Section
  const renderContent = () => {
    const section = sections[currentStep - 1];

    // Safety check: tampilkan loading hanya jika benar-benar null/undefined
    if (!formData)
      return (
        <div className="p-8 text-center text-gray-500 animate-pulse">
          Memuat formulir...
        </div>
      );

    switch (section.id) {
      case "info":
        return (
          <SchoolInfoSection
            formData={formData}
            errors={errors}
            onChange={handleChange}
            kecamatanOptions={kecamatanOptions}
            desaOptions={desaOptions}
            loadingWilayah={loadingWilayah}
            onOpenMap={() => setShowMap(true)}
            readOnlyNpsn={false}
          />
        );

      case "guru":
        return (
          <TeacherSection
            formData={formData}
            onChange={handleChange}
            guruTotalComputed={guruTotalComputed}
          />
        );

      case "siswa":
        return (
          <StudentSection
            formData={formData}
            onChange={handleChange}
            config={config}
            schoolType={effectiveSchoolType}
            activePaudRombelTypes={activePaudRombelTypes}
            totalSiswaComputed={totalSiswaComputed}
          />
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
                          `rombel.paket${pk}.kelas${g}`,
                        )}
                        onChange={(v) =>
                          handleChange(`rombel.paket${pk}.kelas${g}`, v)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {config.isPaud
                  ? activePaudRombelTypes.map((t) => (
                      <NumberInput
                        key={t.key}
                        label={`Rombel ${t.label}`}
                        value={getValue(formData, `rombel.${t.key}`)}
                        onChange={(v) => handleChange(`rombel.${t.key}`, v)}
                      />
                    ))
                  : config.grades?.map((g) => (
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
        if (!LANJUT_OPTIONS[effectiveSchoolType]) return <p>Tidak berlaku.</p>;
        const opt = LANJUT_OPTIONS[effectiveSchoolType];

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
          <InfrastructureSection
            formData={formData}
            onChange={handleChange}
            schoolType={effectiveSchoolType}
            showSmpToiletDetails={true}
          />
        );

      case "kelembagaan":
        return (
          <KelembagaanSection formData={formData} onChange={handleChange} />
        );

      default:
        return <p>Section not found.</p>;
    }
  };

  return (
    <div className={`p-6 ${embedded ? "" : "max-w-6xl mx-auto"}`}>
      {!embedded && (
        <h1 className="text-2xl font-bold mb-6">
          Input Data {effectiveSchoolType}
        </h1>
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
                formData?.latitude && formData?.longitude
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
