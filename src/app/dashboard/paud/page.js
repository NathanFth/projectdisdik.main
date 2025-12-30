"use client";

import { useState } from "react";
import SchoolsTable from "@/app/components/SchoolsTable";
import { Baby } from "lucide-react";

export default function PaudPage() {
  const [jenjang, setJenjang] = useState("PAUD");
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2 flex items-center gap-3">
          <Baby className="h-8 w-8 text-primary" />
          Data {jenjang}
        </h1>
        <p className="text-muted-foreground">
          {jenjang === "TK"
            ? "Kelola data Taman Kanak-kanak (TK)"
            : "Kelola data Pendidikan Anak Usia Dini (PAUD)"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 sm:p-6">
        <SchoolsTable key={jenjang} operatorType={jenjang} />
      </div>
    </>
  );
}
