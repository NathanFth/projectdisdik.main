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
} from "lucide-react";
import { toast } from "sonner";

import { schoolConfigs } from "@/lib/config/schoolConfig";
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
  buildUpdateSchoolWithRelationsPayload,
} from "@/lib/forms/payloadBuilder";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap.jsx"), {
  ssr: false,
});

export default function EditSchoolForm({
  schoolType,
  initialData,
  embedded = false,
  schoolId: schoolIdProp = null,
}) {
  const router = useRouter();
  const effectiveSchoolType = schoolType === "TK" ? "PAUD" : schoolType;

  // 1. Pastikan School ID tersedia
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
      console.error("❌ CRITICAL: School ID missing.");
      toast.error("Terjadi kesalahan sistem: ID Sekolah tidak ditemukan.");
    }
  }, [schoolIdFinal, initialData]);

  const config = useMemo(
    () => schoolConfigs[effectiveSchoolType] || schoolConfigs.default,
    [effectiveSchoolType],
  );

  // 2. NORMALISASI DATA (MANUAL & EKSPLISIT) 🛠️
  const normalizedInitialData = useMemo(() => {
    if (!initialData) return null;

    // A. Ambil Template Kosong (Struktur Baku)
    const tpl = createInitialFormData(config);

    // B. Ambil Data DB
    const meta = initialData.meta || initialData.__metaRaw || {};
    const dbPr = meta.prasarana || initialData.prasarana || {};
    const dbFisik = meta.kegiatanFisik || initialData.kegiatanFisik || {};

    // C. MERGE PRASARANA SECARA MANUAL (Agar Struktur Terjamin)
    const mergedPrasarana = {
      ...tpl.prasarana,
      ...dbPr,

      ukuran: { ...tpl.prasarana.ukuran, ...(dbPr.ukuran || {}) },
      gedung: { ...tpl.prasarana.gedung, ...(dbPr.gedung || {}) },
      classrooms: { ...tpl.prasarana.classrooms, ...(dbPr.classrooms || {}) },
      labs: { ...tpl.prasarana.labs, ...(dbPr.labs || {}) },
      teachers_toilet: {
        ...tpl.prasarana.teachers_toilet,
        ...(dbPr.teachers_toilet || {}),
      },
      students_toilet: {
        ...tpl.prasarana.students_toilet,
        ...(dbPr.students_toilet || {}),
      },
      rooms: { ...tpl.prasarana.rooms, ...(dbPr.rooms || {}) },
      furniture: { ...tpl.prasarana.furniture, ...(dbPr.furniture || {}) },
    };

    // D. Mapping Kegiatan Fisik (Legacy Support)
    const mergedFisik = {
      ...tpl.kegiatanFisik,
      rehabRuangKelas: dbFisik.rehabRuangKelas || dbFisik.rehab_unit || "",
      pembangunanRKB: dbFisik.pembangunanRKB || dbFisik.pembangunan_unit || "",
      rehabToilet: dbFisik.rehabToilet || "",
      pembangunanToilet: dbFisik.pembangunanToilet || "",
    };

    // E. Return Full Object
    return {
      ...initialData,
      namaSekolah:
        initialData.name || initialData.namaSekolah || meta.namaSekolah,
      kecamatan_code: initialData.kecamatan_code || meta.kecamatan_code,
      desa_code: initialData.desa_code || meta.desa_code,
      kecamatan:
        initialData.kecamatan || initialData.kecamatan_name || meta.kecamatan,
      desa: initialData.village_name || initialData.village || meta.desa,
      alamat: initialData.alamat || initialData.address || meta.alamat,
      latitude: initialData.latitude || initialData.lat || meta.latitude,
      longitude: initialData.longitude || initialData.lng || meta.longitude,

      prasarana: mergedPrasarana,
      kegiatanFisik: mergedFisik,

      siswa: meta.siswa || initialData.siswa || tpl.siswa,
      siswaAbk: meta.siswaAbk || initialData.siswaAbk || tpl.siswaAbk,
      guru: meta.guru || initialData.guru || tpl.guru,
      rombel: meta.rombel || initialData.rombel || tpl.rombel,
      lanjut: meta.lanjut || initialData.lanjut || tpl.lanjut,
      kelembagaan:
        meta.kelembagaan || initialData.kelembagaan || tpl.kelembagaan,

      lanjutDalamKab: meta.lanjutDalamKab || initialData.lanjutDalamKab,
      lanjutLuarKab: meta.lanjutLuarKab || initialData.lanjutLuarKab,
      lulusanPaketA: meta.lulusanPaketA || initialData.lulusanPaketA,
      lulusanPaketB: meta.lulusanPaketB || initialData.lulusanPaketB,
      lulusanPaketC: meta.lulusanPaketC || initialData.lulusanPaketC,
    };
  }, [initialData, config]);

  // ✅ FIX KRUSIAL: aktifkan mode EDIT agar draft key per sekolah (draft_edit_{type}_{id})
  const { formData, handleChange, handleBulkUpdate, errors, validate } =
    useDataInput({
      config,
      initialData: normalizedInitialData,
      schoolType: effectiveSchoolType,
      schoolId: schoolIdFinal,
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
        const kecOpts = kecArr
          .map((k) => ({
            value: String(k.kode_kecamatan),
            label: k.nama_kecamatan,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "id"));

        setWilayah(data);
        setKecamatanOptions(kecOpts);
      } catch (err) {
        console.error("Error wilayah:", err);
      } finally {
        setLoadingWilayah(false);
      }
    };
    loadWilayah();
  }, []);

  // Filter Desa
  useEffect(() => {
    if (!wilayah || !wilayah.kecamatan || !formData?.kecamatan_code) {
      setDesaOptions([]);
      return;
    }
    const foundKec = wilayah.kecamatan.find(
      (k) => String(k.kode_kecamatan) === String(formData.kecamatan_code),
    );
    if (foundKec && foundKec.desa) {
      const opts = foundKec.desa
        .map((d) => ({ value: String(d.kode_desa), label: d.nama_desa }))
        .sort((a, b) => a.label.localeCompare(b.label, "id"));
      setDesaOptions(opts);
    } else {
      setDesaOptions([]);
    }
  }, [formData?.kecamatan_code, wilayah]);

  const activePaudRombelTypes = useMemo(() => {
    if (!config.isPaud || !config.rombelTypes) return [];
    return config.rombelTypes;
  }, [config]);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPaud = config.isPaud;
  const isPkbm = effectiveSchoolType === "PKBM";

  const sections = useMemo(
    () => [
      {
        id: "info",
        title: "Info Sekolah",
        icon: <School className="w-5 h-5" />,
        fields: ["namaSekolah", "status", "kecamatan_code", "desa_code"],
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
      toast.error("Gagal menyimpan: ID Sekolah tidak terdeteksi.");
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
      const metaLama = initialData?.__metaRaw || {};

      // ✅ SAFETY: kunci NPSN dari server (menghindari draft lama mengirim NPSN sekolah lain)
      const fixedFormData = {
        ...formData,
        npsn: initialData?.npsn || formData?.npsn || "",
      };

      console.log("📝 [DEBUG] FormData Prasarana:", fixedFormData.prasarana);

      const payload = buildUpdateSchoolWithRelationsPayload({
        formData: fixedFormData,
        config,
        schoolType: effectiveSchoolType,
        kecamatanLabel: kecOpt?.label,
        desaLabel: desaOpt?.label,
        previousMeta: metaLama,
      });

      console.log(
        "🚀 [DEBUG] Payload Final:",
        JSON.stringify(payload, null, 2),
      );

      const { error } = await supabase.rpc("update_school_with_relations", {
        p_school_id: schoolIdFinal,
        p_payload: payload,
      });

      if (error) throw new Error(error.message);

      toast.success("Data berhasil diperbarui!");

      if (typeof window !== "undefined") {
        localStorage.removeItem(
          `draft_edit_${effectiveSchoolType}_${schoolIdFinal}`,
        );
      }

      const routeBase = effectiveSchoolType.toLowerCase();
      router.push(`/dashboard/${routeBase}/${fixedFormData.npsn}`);
      router.refresh();
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
    if (!formData)
      return (
        <div className="p-8 text-center animate-pulse">Memuat data...</div>
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
            readOnlyNpsn={true}
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
                {isPaud
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

  if (!initialData)
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        <span>Memuat data...</span>
      </div>
    );

  return (
    <div className={`p-6 ${embedded ? "" : "max-w-6xl mx-auto"}`}>
      {!embedded && (
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </button>
          <h1 className="text-2xl font-bold">
            Edit Data {effectiveSchoolType}
          </h1>
        </div>
      )}

      {!schoolIdFinal && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">ID Sekolah tidak ditemukan</p>
            <p className="text-sm">
              Penyimpanan dinonaktifkan karena data ID sekolah tidak tersedia.
            </p>
          </div>
        </div>
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
                disabled={saving || !schoolIdFinal}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}{" "}
                Simpan Perubahan
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
