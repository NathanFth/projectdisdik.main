"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StatCards from "../components/StatCards";
import { LayoutDashboard, Plus, Edit } from "lucide-react";

export default function DashboardPage() {
  const { user, roleConfig } = useAuth();
  const router = useRouter();
  const inputPath = roleConfig?.menu?.find((m) =>
    m.path?.endsWith("/input")
  )?.path;
  const dataPath = roleConfig?.menu?.find(
    (m) => m.path && m.path !== "" && !m.path.endsWith("/input")
  )?.path;

  const go = (path) => router.push(`${roleConfig.basePath}${path || ""}`);

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-foreground mb-2 flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              Dashboard {roleConfig.title}
            </h1>
            <p className="text-muted-foreground">
              Selamat datang, <span className="font-medium">{user.email}</span>
              <br />
              Kelola data {roleConfig.description} dengan mudah.
            </p>
          </div>

          <div className="hidden md:flex gap-3">
            <button
              onClick={() => go(inputPath)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Input Data Baru
            </button>
            <button
              onClick={() => go(dataPath)}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              <Edit className="h-4 w-4" />
              Lihat Data
            </button>
          </div>
        </div>
      </div>

<StatCards operatorType={roleConfig.title} />

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mt-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          📋 Informasi untuk Operator {roleConfig.title}
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• Anda terdaftar sebagai operator tingkat {roleConfig.title}</p>
          <p>
            • Data yang Anda input akan otomatis terfilter sesuai jenjang ini.
          </p>
        </div>
      </div>
    </>
  );
}
