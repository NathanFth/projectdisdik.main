// src/app/dashboard/pkbm/input/page.js
"use client";

import InputPageBody from "@/app/components/InputPageBody";
import ImportExcel from "@/app/components/ImportExcel"; // ✅ Import Komponen Bulk
import { ClipboardList } from "lucide-react";

export default function PkbmInputPage() {
  const jenjang = "PKBM"; // Hardcoded untuk PKBM

  return (
    <div className="min-h-screen bg-background md:pl-0">
      <div className="py-6 px-2 sm:px-3 md:px-4 space-y-8">
        {/* FITUR 1: BULK IMPORT/EXPORT */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800 px-1">
            Update Data Massal (Excel)
          </h2>
          <ImportExcel schoolType={jenjang} />
        </div>

        <div className="border-t border-gray-200" />

        {/* FITUR 2: INPUT MANUAL SATUAN */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800 px-1">
            Input / Edit Satuan
          </h2>
          <InputPageBody
            title="Input Data PKBM Terpadu"
            schoolType={jenjang}
            schemaKey="PKBM"
            Icon={ClipboardList}
          />
        </div>
      </div>
    </div>
  );
}
