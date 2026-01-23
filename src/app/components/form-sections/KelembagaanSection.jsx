// src/app/components/form-sections/KelembagaanSection.jsx
"use client";

import { SelectInput, NumberInput } from "../ui/FormInputs";
import { getValue } from "@/lib/forms/payloadBuilder";
import {
  normalizeYesNo,
  normalizeSudahBelum,
  YESNO_OPTIONS,
  SUDAH_BELUM_OPTIONS,
} from "@/lib/forms/normalizers";

export default function KelembagaanSection({ formData, onChange }) {
  return (
    <div className="space-y-8">
      {/* Administrasi & kelengkapan */}
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Administrasi dan kelengkapan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* NOTE: Field Alat Rumah Tangga dipindahkan ke Prasarana sesuai request */}

          <SelectInput
            label="Pembinaan"
            value={normalizeSudahBelum(
              getValue(formData, "kelembagaan.pembinaan")
            )}
            onChange={(v) => onChange("kelembagaan.pembinaan", v)}
            options={SUDAH_BELUM_OPTIONS}
            placeholder="Pilih status..."
          />

          <SelectInput
            label="Asesmen"
            value={normalizeSudahBelum(
              getValue(formData, "kelembagaan.asesmen")
            )}
            onChange={(v) => onChange("kelembagaan.asesmen", v)}
            options={SUDAH_BELUM_OPTIONS}
            placeholder="Pilih status..."
          />
        </div>
      </div>

      {/* Status lainnya */}
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Status penyelenggaraan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <SelectInput
            label="Menyelenggarakan kegiatan belajar"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.menyelenggarakanBelajar")
            )}
            onChange={(v) => onChange("kelembagaan.menyelenggarakanBelajar", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />

          <SelectInput
            label="Melaksanakan rekomendasi"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.melaksanakanRekomendasi")
            )}
            onChange={(v) => onChange("kelembagaan.melaksanakanRekomendasi", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />

          <SelectInput
            label="Siap dievaluasi"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.siapDievaluasi")
            )}
            onChange={(v) => onChange("kelembagaan.siapDievaluasi", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />
        </div>
      </div>

      {/* BOP */}
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">BOP</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <SelectInput
            label="Pengelola BOP tersedia"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.bop.pengelola")
            )}
            onChange={(v) => onChange("kelembagaan.bop.pengelola", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />

          {/* REVISI: Tenaga peningkatan diubah menjadi input Angka */}
          <NumberInput
            label="Jumlah Tenaga Peningkatan"
            value={getValue(formData, "kelembagaan.bop.tenagaPeningkatan")}
            onChange={(v) => onChange("kelembagaan.bop.tenagaPeningkatan", v)}
            placeholder="Masukkan jumlah..."
          />
        </div>
      </div>

      {/* Perizinan */}
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Perizinan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <SelectInput
            label="Pengendalian perizinan"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.perizinan.pengendalian")
            )}
            onChange={(v) => onChange("kelembagaan.perizinan.pengendalian", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />

          <SelectInput
            label="Kelayakan perizinan"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.perizinan.kelayakan")
            )}
            onChange={(v) => onChange("kelembagaan.perizinan.kelayakan", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />
        </div>
      </div>

      {/* Kurikulum */}
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Kurikulum
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <SelectInput
            label="Silabus tersedia"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.kurikulum.silabus")
            )}
            onChange={(v) => onChange("kelembagaan.kurikulum.silabus", v)}
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />

          <SelectInput
            label="Kompetensi dasar tersedia"
            value={normalizeYesNo(
              getValue(formData, "kelembagaan.kurikulum.kompetensiDasar")
            )}
            onChange={(v) =>
              onChange("kelembagaan.kurikulum.kompetensiDasar", v)
            }
            options={YESNO_OPTIONS}
            placeholder="Pilih..."
          />
        </div>
      </div>
    </div>
  );
}
