"use client";

import InputPageBody from "../../../components/InputPageBody";
import { ClipboardList } from "lucide-react";

export default function SmpInputPage() {
  return (
    <>
      <div className="min-h-screen bg-background md:pl-0">
        {/* <TopNavbar /> */}
        <InputPageBody
          title="Input Data SMP"
          schoolType="SMP"
          schemaKey="SMP"
          Icon={ClipboardList}
        />
      </div>
    </>
  );
}
