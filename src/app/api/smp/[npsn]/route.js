// src/app/api/smp/[npsn]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serverError(message) {
  return NextResponse.json({ error: message }, { status: 500 });
}

// GET /api/smp/[npsn] -> data dasar untuk form edit (dari Supabase)
export async function GET(_req, { params }) {
  try {
    const { npsn } = params ?? {};
    if (!npsn) return badRequest("NPSN tidak valid");

    const supabase = createRouteHandlerClient({ cookies });

    // Pastikan user login (biar RLS jalan sesuai operator/divisi)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sesuaikan nama kolom dengan tabelmu jika berbeda
    const { data, error } = await supabase
      .from("schools")
      .select("npsn,name,address,village,type,jenjang,kecamatan")
      .eq("npsn", String(npsn))
      .eq("jenjang", "SMP")
      .maybeSingle();

    if (error) {
      console.error("GET /api/smp/[npsn] supabase error:", error);
      return serverError("Gagal membaca data SMP");
    }

    if (!data) {
      return NextResponse.json(
        { error: "SMP dengan NPSN tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      npsn: data.npsn,
      name: data.name ?? "",
      address: data.address ?? "",
      village: data.village ?? "",
      type: data.type ?? "",
      jenjang: data.jenjang ?? "SMP",
      kecamatan: data.kecamatan ?? "",
    });
  } catch (err) {
    console.error("GET /api/smp/[npsn] error:", err);
    return serverError("Gagal membaca data SMP");
  }
}

// PATCH /api/smp/[npsn] -> simpan perubahan master sekolah (bukan laporan bulanan)
export async function PATCH(req, { params }) {
  try {
    const { npsn } = params ?? {};
    if (!npsn) return badRequest("NPSN tidak valid");

    const supabase = createRouteHandlerClient({ cookies });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Master fields only (audit-friendly)
    const allowedFields = ["name", "address", "village", "type"];
    const updatePayload = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updatePayload[field] = body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return badRequest("Tidak ada field yang diupdate");
    }

    const { data, error } = await supabase
      .from("schools")
      .update(updatePayload)
      .eq("npsn", String(npsn))
      .eq("jenjang", "SMP")
      .select("npsn,name,address,village,type,jenjang,kecamatan")
      .maybeSingle();

    if (error) {
      console.error("PATCH /api/smp/[npsn] supabase error:", error);
      return serverError("Gagal menyimpan perubahan");
    }

    if (!data) {
      return NextResponse.json(
        { error: "SMP dengan NPSN tersebut tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH /api/smp/[npsn] error:", err);
    return serverError("Gagal menyimpan perubahan");
  }
}
