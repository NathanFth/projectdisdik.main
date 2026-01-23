// src/app/components/form-sections/StudentSection.jsx
"use client";

import { NumberInput } from "../ui/FormInputs";
import { getValue } from "@/lib/forms/payloadBuilder";

export default function StudentSection({
  formData,
  onChange,
  config,
  schoolType,
  activePaudRombelTypes = [],
  totalSiswaComputed = 0,
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-blue-50/60 p-5 md:p-6">
        <h2 className="text-base font-semibold text-blue-900">
          Total siswa (reguler):{" "}
          {Number(totalSiswaComputed || 0).toLocaleString("id-ID")}
        </h2>
        <p className="mt-1 text-sm text-blue-900/70">
          Total ini dihitung otomatis dari isian siswa reguler.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">
          Siswa reguler
        </h2>

        {config.isPkbm && config.pakets ? (
          <div className="space-y-5">
            {Object.entries(config.pakets).map(([pk, p]) => (
              <div
                key={pk}
                className="rounded-xl border bg-muted/20 p-5 md:p-6 space-y-5"
              >
                <p className="font-medium text-foreground">
                  {p?.name || `Paket ${pk}`}
                </p>

                {(p.grades || []).map((g) => (
                  <div
                    key={`${pk}-${g}`}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8"
                  >
                    <NumberInput
                      label={`Kelas ${g} - Laki-laki`}
                      value={getValue(formData, `siswa.paket${pk}.kelas${g}.l`)}
                      onChange={(v) =>
                        onChange(`siswa.paket${pk}.kelas${g}.l`, v)
                      }
                    />
                    <NumberInput
                      label={`Kelas ${g} - Perempuan`}
                      value={getValue(formData, `siswa.paket${pk}.kelas${g}.p`)}
                      onChange={(v) =>
                        onChange(`siswa.paket${pk}.kelas${g}.p`, v)
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
              <div key={g} className="rounded-xl border bg-muted/20 p-5 md:p-6">
                <p className="font-medium text-foreground mb-4">Kelas {g}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  <NumberInput
                    label="Laki-laki"
                    value={getValue(formData, `siswa.kelas${g}.l`)}
                    onChange={(v) => onChange(`siswa.kelas${g}.l`, v)}
                  />
                  <NumberInput
                    label="Perempuan"
                    value={getValue(formData, `siswa.kelas${g}.p`)}
                    onChange={(v) => onChange(`siswa.kelas${g}.p`, v)}
                  />
                </div>
              </div>
            ))}

            {config.isPaud &&
              activePaudRombelTypes.map((t) => (
                <div
                  key={t.key}
                  className="rounded-xl border bg-muted/20 p-5 md:p-6"
                >
                  <p className="font-medium text-foreground mb-4">{t.label}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <NumberInput
                      label="Laki-laki"
                      value={getValue(formData, `siswa.${t.key}.l`)}
                      onChange={(v) => onChange(`siswa.${t.key}.l`, v)}
                    />
                    <NumberInput
                      label="Perempuan"
                      value={getValue(formData, `siswa.${t.key}.p`)}
                      onChange={(v) => onChange(`siswa.${t.key}.p`, v)}
                    />
                  </div>
                </div>
              ))}
          </>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Siswa berkebutuhan khusus
          </h2>
          <span className="text-xs text-muted-foreground">(ABK)</span>
        </div>

        {config.isPkbm && config.pakets ? (
          <div className="space-y-5">
            {Object.entries(config.pakets).map(([pk, p]) => (
              <div
                key={`abk-${pk}`}
                className="rounded-xl border bg-orange-50/40 p-5 md:p-6 space-y-5"
              >
                <p className="font-medium text-foreground">
                  ABK - {p?.name || `Paket ${pk}`}
                </p>

                {(p.grades || []).map((g) => (
                  <div
                    key={`abk-${pk}-${g}`}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8"
                  >
                    <NumberInput
                      label={`Kelas ${g} - Laki-laki (ABK)`}
                      value={getValue(
                        formData,
                        `siswaAbk.paket${pk}.kelas${g}.l`
                      )}
                      onChange={(v) =>
                        onChange(`siswaAbk.paket${pk}.kelas${g}.l`, v)
                      }
                    />
                    <NumberInput
                      label={`Kelas ${g} - Perempuan (ABK)`}
                      value={getValue(
                        formData,
                        `siswaAbk.paket${pk}.kelas${g}.p`
                      )}
                      onChange={(v) =>
                        onChange(`siswaAbk.paket${pk}.kelas${g}.p`, v)
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
                className="rounded-xl border bg-orange-50/40 p-5 md:p-6"
              >
                <p className="font-medium text-foreground mb-4">
                  ABK - Kelas {g}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  <NumberInput
                    label="Laki-laki (ABK)"
                    value={getValue(formData, `siswaAbk.kelas${g}.l`)}
                    onChange={(v) => onChange(`siswaAbk.kelas${g}.l`, v)}
                  />
                  <NumberInput
                    label="Perempuan (ABK)"
                    value={getValue(formData, `siswaAbk.kelas${g}.p`)}
                    onChange={(v) => onChange(`siswaAbk.kelas${g}.p`, v)}
                  />
                </div>
              </div>
            ))}

            {config.isPaud &&
              activePaudRombelTypes.map((t) => (
                <div
                  key={`abk-${t.key}`}
                  className="rounded-xl border bg-orange-50/40 p-5 md:p-6"
                >
                  <p className="font-medium text-foreground mb-4">
                    ABK - {t.label}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <NumberInput
                      label="Laki-laki (ABK)"
                      value={getValue(formData, `siswaAbk.${t.key}.l`)}
                      onChange={(v) => onChange(`siswaAbk.${t.key}.l`, v)}
                    />
                    <NumberInput
                      label="Perempuan (ABK)"
                      value={getValue(formData, `siswaAbk.${t.key}.p`)}
                      onChange={(v) => onChange(`siswaAbk.${t.key}.p`, v)}
                    />
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
