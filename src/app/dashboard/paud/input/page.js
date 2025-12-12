"use client";

import { useState } from "react";
import Sidebar from "../../../components/Sidebar";
import InputPageBody from "../../../components/InputPageBody";
import { ClipboardList, Baby, School } from "lucide-react";

const SCHOOL_OPTIONS = [
  {
    key: "PAUD",
    label: "PAUD",
    title: "Input Data PAUD",
    description:
      "Untuk satuan pendidikan PAUD non-TK (KB, SPS/TPA, dan sejenisnya).",
    Icon: Baby,
  },
  {
    key: "TK",
    label: "TK",
    title: "Input Data TK",
    description: "Untuk satuan pendidikan TK A / TK B.",
    Icon: School,
  },
];

export default function PaudInputPage() {
  const [selectedType, setSelectedType] = useState(null);

  const selected =
    SCHOOL_OPTIONS.find((opt) => opt.key === selectedType) || null;

  return (
    <>
      {/* Sidebar sama seperti halaman TK */}
      <Sidebar />

      <div className="min-h-screen bg-background md:pl-0 px-3 sm:px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header umum divisi TK/PAUD */}
          <header className="mb-4">
            <h1 className="text-3xl text-foreground mb-2 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              Input Data TK/PAUD
            </h1>
            <p className="text-muted-foreground">
              Pilih jenis satuan pendidikan terlebih dahulu sebelum mengisi
              data.
            </p>
          </header>

          {/* STEP 1: Pilih PAUD atau TK */}
          {!selected && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SCHOOL_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedType(opt.key)}
                  className="group relative rounded-xl border bg-card text-left p-5 shadow-sm hover:shadow-md hover:border-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-primary/10 group-hover:bg-primary/20">
                      <opt.Icon className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{opt.label}</div>
                      <p className="text-sm text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Klik untuk mulai input</span>
                    <span className="font-medium group-hover:text-primary">
                      Lanjut &rarr;
                    </span>
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* STEP 2: Form sesuai pilihan */}
          {selected && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Jenis satuan pendidikan
                  </p>
                  <div className="flex items-center gap-2">
                    <selected.Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{selected.label}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="text-xs sm:text-sm rounded-lg border px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Ganti Pilihan
                </button>
              </div>

              <InputPageBody
                title={selected.title}
                schoolType={selected.key}
                schemaKey="TKPAUD" // tetap pakai skema gabungan seperti sebelumnya
                Icon={ClipboardList}
              />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
