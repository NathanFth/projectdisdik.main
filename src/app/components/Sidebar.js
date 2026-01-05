// src/app/components/Sidebar.jsx
"use client";

import Link from "next/link";
import Image from "next/image"; // ✅ Import Image untuk logo
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  Baby,
  GraduationCap,
  School,
  FileText,
} from "lucide-react";

// Mapping Icon
const IconMap = {
  LayoutDashboard,
  BookOpen,
  Plus,
  Baby,
  GraduationCap,
  School,
  FileText,
};

export default function Sidebar() {
  const { roleConfig } = useAuth();
  const pathname = usePathname();

  return (
    // Sidebar Container
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white border-r border-gray-200 flex flex-col shadow-[2px_0_20px_-10px_rgba(0,0,0,0.05)] z-30">
      {/* === 1. BRANDING HEADER (Official Look) === */}
      <div className="flex flex-col items-center justify-center py-8 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
        {/* Logo Garut (Perisai) */}
        <div className="relative w-14 h-16 mb-3 drop-shadow-sm filter">
          <Image
            src="/images/garut-logo.png" // ✅ Pastikan file ada di public/images/
            alt="Logo Kabupaten Garut"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Teks Branding (Dibuat dengan Code agar Tajam) */}
        <div className="text-center space-y-0.5">
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight leading-none">
            DISDIK
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            Kabupaten Garut
          </p>
        </div>
      </div>

      {/* === 2. NAVIGATION LABEL === */}
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Menu Utama
        </h3>
      </div>

      {/* === 3. NAVIGATION LIST === */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {roleConfig?.menu.map((item) => {
          const IconComponent = IconMap[item.icon] || LayoutDashboard;

          const fullPath =
            item.path === ""
              ? roleConfig.basePath
              : `${roleConfig.basePath}${item.path}`;

          // Logic Exact Match (Sesuai request agar tidak double active)
          const isActive = pathname === fullPath;

          return (
            <Link
              key={item.name}
              href={fullPath}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100" // Style Aktif (Lebih Tegas)
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900" // Style Inaktif
              }`}
            >
              <IconComponent
                size={18}
                className={`transition-colors ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              />
              {item.name}

              {/* Active Indicator (Dot Biru di Kanan) */}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* === 4. FOOTER INFO === */}
      <div className="p-4 m-3 mt-auto border border-gray-100 rounded-xl bg-gray-50/80">
        <div className="flex flex-col gap-1 text-center">
          <p className="text-xs font-semibold text-gray-600">
            e-PlanDISDIK Operator
          </p>
          <p className="text-[10px] text-gray-400">
            © 2025 Dinas Pendidikan
            <br />
            Versi 1.0.0 (Beta)
          </p>
        </div>
      </div>
    </aside>
  );
}
