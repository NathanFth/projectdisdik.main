"use client";

import { useMemo, useState } from "react";
import InputPageBody from "../../../components/InputPageBody";
import { ClipboardList } from "lucide-react";

export default function PaudInputPage() {
  // pilihan jenjang di dalam school_type_id=1
  const [jenjang, setJenjang] = useState("PAUD"); // "PAUD" | "TK"

  const title = useMemo(() => {
    return jenjang === "TK" ? "Input Data TK" : "Input Data PAUD";
  }, [jenjang]);

  return (
    <div className="min-h-screen bg-background md:pl-0">
      <div className="py-6 px-2 sm:px-3 md:px-4 space-y-4">
        {/* selector jenjang */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setJenjang("PAUD")}
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              jenjang === "PAUD"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            PAUD
          </button>

          <button
            type="button"
            onClick={() => setJenjang("TK")}
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              jenjang === "TK"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            TK
          </button>
        </div>

        {/* body form + import */}
        <InputPageBody
          title={title}
          schoolType={jenjang} // ✅ penting: kirim "PAUD" atau "TK"
          schemaKey="TKPAUD"
          Icon={ClipboardList}
        />
      </div>
    </div>
  );
}
