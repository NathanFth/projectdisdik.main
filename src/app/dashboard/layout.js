// src/app/dashboard/layout.js (atau layout utama dashboardmu)
"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import Sidebar from "../components/Sidebar";
import TopNavbar from "../components/TopNavbar";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner"; // ✅ 1. IMPORT INI WAJIB

function DashboardContent({ children }) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Memuat data pengguna...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />

        <main className="flex-1 overflow-y-auto p-6 space-y-8 fade-in scroll-smooth">
          {children}
        </main>
      </div>

      {/* ✅ 2. PASANG SPEAKERNYA DI SINI */}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
