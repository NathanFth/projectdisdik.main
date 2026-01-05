"use client";

import InputPageBody from "../../../components/InputPageBody";
import { ClipboardList } from "lucide-react";

export default function PkbmInputPage() {
  return (
    <>
      <div className="min-h-screen bg-background md:pl-0">
        {/* <TopNavbar /> */}
        <InputPageBody
          title="Input Data PKBM Terpadu"
          schoolType="PKBM"
          schemaKey="PKBM"
          Icon={ClipboardList}
        />
      </div>
    </>
  );
}
