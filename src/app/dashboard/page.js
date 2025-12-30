"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StatCards from "../components/StatCards";
import { LayoutDashboard } from "lucide-react";

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
        </div>
      </div>

<StatCards operatorType={roleConfig.title} />
    </>
  );
}
