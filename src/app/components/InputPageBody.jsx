// src/app/components/InputPageBody.jsx
"use client";

import DataInputForm from "./DataInputForm";

export default function InputPageBody({ title, schoolType, schemaKey, Icon }) {
  // State untuk tab sudah dihapus karena Import Excel sudah ada di dalam DataInputForm

  return (
    <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
      <header className="mb-8">
        <h1 className="text-3xl text-foreground mb-2 flex items-center gap-3">
          <Icon className="h-8 w-8 text-primary" />
          {title}
        </h1>
        <p className="text-muted-foreground">
          Silakan lengkapi data sekolah di bawah ini. Gunakan fitur{" "}
          <b>Import Excel</b> yang tersedia di dalam form untuk pengisian lebih
          cepat.
        </p>
      </header>

      {/* Container Form Langsung (Tanpa Tab) */}
      <div className="rounded-xl border bg-card text-card-foreground p-3 sm:p-4 shadow-sm">
        <DataInputForm schoolType={schoolType} embedded />
      </div>
    </main>
  );
}
