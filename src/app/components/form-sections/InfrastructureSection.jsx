// src/app/components/form-sections/InfrastructureSection.jsx
"use client";

import { NumberInput, SelectInput } from "../ui/FormInputs";
import { getValue } from "@/lib/forms/payloadBuilder";
import {
  LAHAN_OPTIONS,
  normalizePeralatanRumahTangga,
  PERALATAN_RUMAH_TANGGA_OPTIONS,
} from "@/lib/forms/normalizers";

const CLASSROOM_LABELS = {
  total_room: "Jumlah ruang kelas",
  classrooms_good: "Baik",
  rusakRingan: "Rusak ringan",
  classrooms_moderate_damage: "Rusak sedang",
  heavy_damage: "Rusak berat",
  rusakTotal: "Rusak total",
};

const CLASSROOM_EXTRA_LABELS = {
  kurangRkb: "Kekurangan ruang kelas",
  kelebihan: "Kelebihan ruang kelas",
  rkbTambahan: "Kebutuhan ruang kelas tambahan",
};

// UPDATED: Added Rusak Ringan & Rusak Total
const LAB_STATS = [
  { key: "total_all", label: "Jumlah" },
  { key: "good", label: "Baik" },
  { key: "rusakRingan", label: "Rusak ringan" },
  { key: "moderate_damage", label: "Rusak sedang" },
  { key: "heavy_damage", label: "Rusak berat" },
  { key: "rusakTotal", label: "Rusak total" },
];

// UPDATED: Added Rusak Ringan & Rusak Total
const TOILET_STATS = [
  { key: "total", label: "Jumlah" },
  { key: "good", label: "Baik" },
  { key: "rusakRingan", label: "Rusak ringan" },
  { key: "moderate_damage", label: "Rusak sedang" },
  { key: "heavy_damage", label: "Rusak berat" },
  { key: "rusakTotal", label: "Rusak total" },
];

// NEW: Standard stats for supporting rooms
const ROOM_STATS = [
  { key: "total", label: "Jumlah" },
  { key: "good", label: "Baik" },
  { key: "rusakRingan", label: "Rusak ringan" },
  { key: "moderate_damage", label: "Rusak sedang" },
  { key: "heavy_damage", label: "Rusak berat" },
  { key: "rusakTotal", label: "Rusak total" },
];

export default function InfrastructureSection({
  formData,
  onChange,
  schoolType,
  showSmpToiletDetails = true,
}) {
  const isSmp = schoolType === "SMP";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";

  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Ukuran lahan dan bangunan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <NumberInput
            label="Luas tanah (m²)"
            value={getValue(formData, "prasarana.ukuran.tanah")}
            onChange={(v) => onChange("prasarana.ukuran.tanah", v)}
          />
          <NumberInput
            label="Luas bangunan (m²)"
            value={getValue(formData, "prasarana.ukuran.bangunan")}
            onChange={(v) => onChange("prasarana.ukuran.bangunan", v)}
          />
          <NumberInput
            label="Luas halaman (m²)"
            value={getValue(formData, "prasarana.ukuran.halaman")}
            onChange={(v) => onChange("prasarana.ukuran.halaman", v)}
          />
          <NumberInput
            label="Jumlah gedung"
            value={getValue(formData, "prasarana.gedung.jumlah")}
            onChange={(v) => onChange("prasarana.gedung.jumlah", v)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Kondisi ruang kelas
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
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
              label={CLASSROOM_LABELS[k] || k}
              value={getValue(formData, `prasarana.classrooms.${k}`)}
              onChange={(v) => onChange(`prasarana.classrooms.${k}`, v)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-6">
          {["kurangRkb", "kelebihan", "rkbTambahan"].map((k) => (
            <NumberInput
              key={k}
              label={CLASSROOM_EXTRA_LABELS[k] || k}
              value={getValue(formData, `prasarana.classrooms.${k}`)}
              onChange={(v) => onChange(`prasarana.classrooms.${k}`, v)}
            />
          ))}

          <SelectInput
            label="Ketersediaan lahan"
            value={getValue(formData, "prasarana.classrooms.lahan") || ""}
            onChange={(v) => onChange("prasarana.classrooms.lahan", v)}
            options={LAHAN_OPTIONS}
            placeholder="Pilih..."
          />
        </div>
      </div>

      {isSmp && (
        <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Laboratorium
          </h2>

          <div className="space-y-5">
            {[
              { k: "laboratory_comp", l: "Komputer" },
              { k: "laboratory_langua", l: "Bahasa" },
              { k: "laboratory_ipa", l: "IPA" },
              { k: "laboratory_fisika", l: "Fisika" },
              { k: "laboratory_biologi", l: "Biologi" },
            ].map((lb) => (
              <div key={lb.k} className="rounded-lg border bg-white p-4">
                <p className="font-medium text-foreground mb-3">
                  Laboratorium {lb.l}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {LAB_STATS.map((stat) => (
                    <NumberInput
                      key={stat.key}
                      label={stat.label}
                      value={getValue(
                        formData,
                        `prasarana.labs.${lb.k}.${stat.key}`
                      )}
                      onChange={(v) =>
                        onChange(`prasarana.labs.${lb.k}.${stat.key}`, v)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSmp && showSmpToiletDetails && (
        <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Kondisi toilet
          </h2>

          <div className="space-y-5">
            {[
              {
                label: "Toilet guru (laki-laki)",
                path: "teachers_toilet.male",
              },
              {
                label: "Toilet guru (perempuan)",
                path: "teachers_toilet.female",
              },
              {
                label: "Toilet siswa (laki-laki)",
                path: "students_toilet.male",
              },
              {
                label: "Toilet siswa (perempuan)",
                path: "students_toilet.female",
              },
            ].map((item) => (
              <div key={item.path} className="rounded-lg border bg-white p-4">
                <p className="font-medium text-foreground mb-3">{item.label}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {TOILET_STATS.map((s) => (
                    <NumberInput
                      key={s.key}
                      label={s.label}
                      value={getValue(
                        formData,
                        `prasarana.${item.path}.${s.key}`
                      )}
                      onChange={(v) =>
                        onChange(`prasarana.${item.path}.${s.key}`, v)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Ruang penunjang
        </h2>

        <div className="space-y-5">
          {[
            { k: "library", l: "Perpustakaan" },
            // Logic: Tampilkan APE jika PAUD, Tampilkan Lab Umum jika BUKAN PAUD & BUKAN SMP
            ...(isPaud
              ? [{ k: "ape", l: "Alat Permainan Edukasi (APE)" }]
              : []),
            ...(!isSmp && !isPaud
              ? [{ k: "laboratory", l: "Laboratorium (umum)" }]
              : []),
            { k: "headmaster_room", l: "Ruang Kepala Sekolah" },
            { k: "teacher_room", l: "Ruang Guru" },
            // ADDED: Ruang Tata Usaha
            { k: "administration_room", l: "Ruang Tata Usaha" },
            { k: "uks_room", l: "Ruang UKS" },
            ...(!isSmp ? [{ k: "toilets", l: "Toilet umum" }] : []),
            { k: "official_residences", l: "Rumah dinas" },
          ].map((r) => (
            <div key={r.k} className="rounded-lg border bg-white p-4">
              <p className="font-medium text-foreground mb-3">{r.l}</p>

              {/* UPDATED: Menggunakan ROOM_STATS agar ada Rusak Ringan & Rusak Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ROOM_STATS.map((stat) => (
                  <NumberInput
                    key={stat.key}
                    label={stat.label}
                    value={getValue(
                      formData,
                      `prasarana.rooms.${r.k}.${stat.key}`
                    )}
                    onChange={(v) =>
                      onChange(`prasarana.rooms.${r.k}.${stat.key}`, v)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Perabot dan perangkat
        </h2>

        {/* REVISI: Field Alat Rumah Tangga dipindahkan ke sini */}
        <div className="mb-6">
          <SelectInput
            label="Kondisi alat rumah tangga"
            value={normalizePeralatanRumahTangga(
              getValue(formData, "prasarana.peralatanRumahTangga")
            )}
            onChange={(v) => onChange("prasarana.peralatanRumahTangga", v)}
            options={PERALATAN_RUMAH_TANGGA_OPTIONS}
            placeholder="Pilih kondisi..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { item: "tables", label: "Meja" },
            { item: "chairs", label: "Kursi" },
            { item: "whiteboard", label: "Papan Tulis" },
          ].flatMap(({ item, label }) =>
            [
              { s: "total", l: "Jumlah" },
              { s: "good", l: "Baik" },
              { s: "heavy_damage", l: "Rusak" },
            ].map(({ s, l }) => (
              <NumberInput
                key={`${item}-${s}`}
                label={`${label} - ${l}`}
                value={getValue(formData, `prasarana.furniture.${item}.${s}`)}
                onChange={(v) =>
                  onChange(`prasarana.furniture.${item}.${s}`, v)
                }
              />
            ))
          )}

          <NumberInput
            label="Komputer (unit)"
            value={getValue(formData, "prasarana.furniture.computer")}
            onChange={(v) => onChange("prasarana.furniture.computer", v)}
          />

          <NumberInput
            label="Chromebook (unit)"
            value={getValue(formData, "prasarana.chromebook")}
            onChange={(v) => onChange("prasarana.chromebook", v)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Rencana kegiatan fisik
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          <NumberInput
            label="Rehabilitasi ruang kelas"
            value={getValue(formData, "kegiatanFisik.rehabRuangKelas")}
            onChange={(v) => onChange("kegiatanFisik.rehabRuangKelas", v)}
          />
          <NumberInput
            label="Pembangunan ruang kelas baru"
            value={getValue(formData, "kegiatanFisik.pembangunanRKB")}
            onChange={(v) => onChange("kegiatanFisik.pembangunanRKB", v)}
          />
          <NumberInput
            label="Rehabilitasi toilet"
            value={getValue(formData, "kegiatanFisik.rehabToilet")}
            onChange={(v) => onChange("kegiatanFisik.rehabToilet", v)}
          />
          <NumberInput
            label="Pembangunan toilet"
            value={getValue(formData, "kegiatanFisik.pembangunanToilet")}
            onChange={(v) => onChange("kegiatanFisik.pembangunanToilet", v)}
          />
        </div>
      </div>
    </div>
  );
}
