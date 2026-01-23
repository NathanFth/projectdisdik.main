// src/middleware.js
// ------------------------------------------------------------
// Middleware untuk proteksi route /dashboard/*
//
// Alasan:
// - Saat ini proteksi dashboard dilakukan di client (AuthContext + router.replace).
//   Itu menimbulkan "blank screen" / flicker dan membuka peluang halaman sempat
//   terlihat sebelum redirect.
// - Middleware membuat redirect terjadi sebelum halaman dirender.
//
// Catatan:
// - Menggunakan @supabase/auth-helpers-nextjs yang sudah dipakai di route handler.
// ------------------------------------------------------------

import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Proteksi semua halaman dashboard
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";

    // Simpan tujuan agar setelah login bisa balik ke halaman asal.
    const next = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    if (next && next !== "/login") {
      loginUrl.searchParams.set("next", next);
    }

    return NextResponse.redirect(loginUrl);
  }

  // Penting: return res agar auth-helpers bisa menulis cookies kalau perlu.
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
