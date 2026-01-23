"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { UserIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import { authService } from "@/services/authService";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Hindari open-redirect: hanya izinkan path relatif internal.
  const redirectTo = useMemo(() => {
    const raw = searchParams?.get("next");
    if (!raw) return "/dashboard";

    // next/navigation sudah meng-decode, tapi kita tetap defensif.
    const next = String(raw).trim();
    if (!next.startsWith("/")) return "/dashboard";
    if (next.startsWith("//")) return "/dashboard";
    return next;
  }, [searchParams]);

  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.getSession();
      if (session) {
        router.replace(redirectTo);
      }
    };
    checkSession();
  }, [router, redirectTo]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authService.login(formData.email, formData.password);

      if (result.success) {
        router.refresh();
        router.replace(redirectTo);
        return;
      }

      setError(result.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:w-1/2 w-full bg-gradient-to-b from-blue-600 to-blue-800 text-white flex flex-col justify-center items-center p-10 relative overflow-hidden">
        <div className="absolute opacity-10 w-[300px] h-[300px]">
          <Image
            src="/images/garut-logo.png"
            alt="Logo Garut Background"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-4xl font-bold mb-4">e-PlanDISDIK</h1>
          <p className="text-lg leading-snug">
            Electronic Planning Dinas Pendidikan <br /> Kabupaten Garut
          </p>
          <a
            href="https://disdik.garutkab.go.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 bg-blue-500 hover:bg-blue-400 px-6 py-2 rounded-full font-medium transition inline-block text-white"
          >
            Selengkapnya
          </a>
        </div>
      </div>

      <div className="md:w-1/2 w-full bg-white flex flex-col justify-center items-center px-6 py-12">
        <div className="mb-6 relative w-40 h-40">
          <Image
            src="/images/disdik-logo.png"
            alt="Logo DISDIK"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          Selamat Datang di
        </h2>
        <h1 className="text-3xl font-bold text-blue-800 mb-4">e-PlanDISDIK</h1>
        <p className="text-gray-500 mb-6">
          Silahkan Login untuk mengelola data
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-4 bg-white"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-pulse">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center border border-gray-300 rounded-full px-4 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full outline-none bg-transparent"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center border border-gray-300 rounded-full px-4 py-2 relative focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
            <LockClosedIcon className="h-5 w-5 text-gray-400 mr-2" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              className="w-full outline-none bg-transparent pr-10"
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute right-3 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white font-semibold py-2 rounded-full hover:bg-blue-500 transition shadow-lg ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
