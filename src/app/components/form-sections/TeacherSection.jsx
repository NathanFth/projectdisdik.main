// src/app/components/form-sections/TeacherSection.jsx
"use client";

import { NumberInput } from "../ui/FormInputs";
import { getValue } from "@/lib/forms/payloadBuilder";

export default function TeacherSection({
  formData,
  onChange,
  guruTotalComputed = 0,
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-blue-50/60 p-5 md:p-6">
        <h2 className="text-base font-semibold text-blue-900">
          Total guru: {Number(guruTotalComputed || 0).toLocaleString("id-ID")}
        </h2>
        <p className="mt-1 text-sm text-blue-900/70">
          Jumlah ini dihitung otomatis dari isian di bawah.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Rincian guru
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <NumberInput
            label="Guru PNS"
            value={getValue(formData, "guru.pns")}
            onChange={(v) => onChange("guru.pns", v)}
          />
          <NumberInput
            label="Guru PPPK"
            value={getValue(formData, "guru.pppk")}
            onChange={(v) => onChange("guru.pppk", v)}
          />
          <NumberInput
            label="Guru PPPK (paruh waktu)"
            value={getValue(formData, "guru.pppkParuhWaktu")}
            onChange={(v) => onChange("guru.pppkParuhWaktu", v)}
          />
          <NumberInput
            label="Guru Non-ASN (terdata di Dapodik)"
            value={getValue(formData, "guru.nonAsnDapodik")}
            onChange={(v) => onChange("guru.nonAsnDapodik", v)}
          />
          <NumberInput
            label="Guru Non-ASN (tidak terdata di Dapodik)"
            value={getValue(formData, "guru.nonAsnTidakDapodik")}
            onChange={(v) => onChange("guru.nonAsnTidakDapodik", v)}
          />
          <NumberInput
            label="Kekurangan guru"
            value={getValue(formData, "guru.kekuranganGuru")}
            onChange={(v) => onChange("guru.kekuranganGuru", v)}
          />
        </div>
      </div>
    </div>
  );
}
