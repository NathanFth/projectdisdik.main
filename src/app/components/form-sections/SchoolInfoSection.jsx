// src/app/components/form-sections/SchoolInfoSection.jsx
"use client";

import { Label } from "../ui/label";
import { TextInput, SelectInput } from "../ui/FormInputs";

import { normalizeStatus, STATUS_OPTIONS } from "@/lib/forms/normalizers";

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

export default function SchoolInfoSection({
  formData,
  errors = {},
  onChange,
  kecamatanOptions = [],
  desaOptions = [],
  loadingWilayah = false,
  onOpenMap = () => {},
  readOnlyNpsn = false,
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Identitas sekolah
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <TextInput
            label="Nama sekolah"
            value={formData.namaSekolah || ""}
            onChange={(v) => onChange("namaSekolah", v)}
            error={errors.namaSekolah}
            required
          />

          {readOnlyNpsn ? (
            <ReadOnlyField label="NPSN" value={formData.npsn} mono />
          ) : (
            <TextInput
              label="NPSN"
              value={formData.npsn || ""}
              onChange={(v) => onChange("npsn", v)}
              error={errors.npsn}
              required
            />
          )}

          <SelectInput
            label="Status sekolah"
            value={normalizeStatus(formData.status)}
            onChange={(v) => onChange("status", v)}
            error={errors.status}
            options={STATUS_OPTIONS}
            placeholder="Pilih status..."
          />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Wilayah dan alamat
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <SelectInput
            label="Kecamatan"
            value={String(formData.kecamatan_code || "")}
            onChange={(k) => {
              const opt = kecamatanOptions.find(
                (o) => String(o.value) === String(k)
              );
              onChange("kecamatan_code", String(k));
              onChange("kecamatan", opt?.label || "");
              onChange("desa_code", "");
              onChange("desa", "");
            }}
            error={errors.kecamatan_code}
            options={kecamatanOptions}
            placeholder={loadingWilayah ? "Memuat..." : "Pilih kecamatan..."}
            disabled={loadingWilayah || !kecamatanOptions.length}
          />

          <div className="space-y-1.5">
            <SelectInput
              label="Desa/Kelurahan"
              value={String(formData.desa_code || "")}
              onChange={(k) => {
                const opt = desaOptions.find(
                  (o) => String(o.value) === String(k)
                );
                onChange("desa_code", String(k));
                onChange("desa", opt?.label || "");
              }}
              error={errors.desa_code}
              options={desaOptions}
              placeholder={
                formData.kecamatan_code
                  ? "Pilih desa/kelurahan..."
                  : "Pilih kecamatan terlebih dahulu..."
              }
              disabled={
                !formData.kecamatan_code || loadingWilayah || !desaOptions.length
              }
            />

            {formData.kecamatan_code && !loadingWilayah && !desaOptions.length && (
              <p className="text-xs text-muted-foreground">
                Data desa/kelurahan belum tersedia untuk kecamatan ini.
              </p>
            )}
          </div>

          <TextInput
            label="Alamat"
            value={formData.alamat || ""}
            onChange={(v) => onChange("alamat", v)}
            error={errors.alamat}
            placeholder="Contoh: Jl. ... RT/RW ..."
          />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Titik lokasi
        </h2>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <TextInput
              label="Latitude"
              value={formData.latitude || ""}
              onChange={(v) => onChange("latitude", v)}
              error={errors.latitude}
              placeholder="-6.9"
            />
            <TextInput
              label="Longitude"
              value={formData.longitude || ""}
              onChange={(v) => onChange("longitude", v)}
              error={errors.longitude}
              placeholder="107.5"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Pilih titik lokasi di peta
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Opsional, tetapi disarankan agar lokasi sekolah lebih akurat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
