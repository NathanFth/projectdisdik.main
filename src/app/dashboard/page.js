"use client";

import { useAuth } from "@/context/AuthContext";
import StatCards from "../components/StatCards";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  const { user, roleConfig } = useAuth();

  const title = roleConfig?.title ?? "Dashboard";
  const description = roleConfig?.description ?? "";
  const jenjang = roleConfig?.jenjang || roleConfig?.title; // fallback legacy

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-foreground mb-2 flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              Dashboard {title}
            </h1>

            <p className="text-muted-foreground">
              Selamat datang, <span className="font-medium">{user?.email}</span>
              {description ? (
                <>
                  <br />
                  Kelola data {description} dengan mudah.
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* StatCards menggunakan operatorType/jenjang (SD/SMP/...) */}
      <StatCards operatorType={jenjang} />
    </>
  );
}
