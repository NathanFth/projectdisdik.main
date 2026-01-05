"use client";

import InputPageBody from "../../../components/InputPageBody";
import { ClipboardList } from "lucide-react";

export default function TkInputPage() {
  return (
    <>
      <div className="min-h-screen bg-background md:pl-0">
        <main className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
          <InputPageBody
            title="Input Data TK"
            schoolType="TK"
            schemaKey="TK" // ✅ FIX: per-jenjang
            Icon={ClipboardList}
          />
        </main>
      </div>
    </>
  );
}
