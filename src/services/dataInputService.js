// src/services/dataInputService.js
import { supabase } from "@/lib/supabase/lib/client";
import { schoolConfigs } from "@/lib/config/schoolConfig";
import { buildUpdateSchoolWithRelationsPayload } from "@/lib/forms/payloadBuilder";

const chunkArray = (arr, size = 500) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const safeObj = (v) =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};

const formatBatchErrors = (rawErrors) => {
  if (!Array.isArray(rawErrors)) return [];
  return rawErrors.map((e) => {
    const rowIndex = e?.row_index ?? "-";
    const npsn = e?.npsn ?? "";
    const msg = e?.message ?? "Kesalahan tidak diketahui";
    const npsnLabel = npsn ? `NPSN ${npsn}` : "NPSN -";
    return `Baris ${rowIndex} (${npsnLabel}): ${msg}`;
  });
};

export const dataInputService = {
  /**
   * 1. GET DATA UNTUK TEMPLATE
   */
  async getAllSchoolsForTemplate(schoolType) {
    try {
      console.log(
        `[Service] Mengambil data sekolah untuk jenjang: ${schoolType}`,
      );

      const { data, error } = await supabase.rpc("get_all_schools_by_type", {
        input_jenjang: schoolType,
      });

      if (error) {
        console.error("[Service] Error RPC:", error);
        throw error;
      }

      console.log(`[Service] Data ditemukan: ${data?.length || 0} sekolah`);
      return data || [];
    } catch (err) {
      console.error("Gagal mengambil data template:", err);
      throw err;
    }
  },

  /**
   * 2. BATCH UPSERT (HIGH PERFORMANCE) - 1x RPC CALL
   * - Tetap kompatibel dengan ImportExcel.jsx (signature sama)
   * - onProgress dipakai untuk progress fase "pre-build payload" (client-side)
   */
  async batchUpdateSchools(schoolType, schoolsData, onProgress) {
    const config = schoolConfigs[schoolType] || schoolConfigs.default;

    const rows = Array.isArray(schoolsData) ? schoolsData : [];
    const total = rows.length;

    if (total === 0) {
      return { successCount: 0, failCount: 0, errors: [] };
    }

    // 1) Ambil daftar NPSN yang ada (untuk fetch meta existing 1x / chunked)
    const npsnList = rows
      .map((r) => (r?.npsn != null ? String(r.npsn).trim() : ""))
      .filter(Boolean);

    const uniqueNpsn = Array.from(new Set(npsnList));

    const metaByNpsn = new Map();

    // 2) Fetch meta existing (hindari hilangnya key meta yang tidak ada di template)
    //    Ini tetap 1-2 request (tergantung ukuran), bukan N+1.
    try {
      const chunks = chunkArray(uniqueNpsn, 500);
      for (const part of chunks) {
        const { data, error } = await supabase
          .from("schools")
          .select("npsn, meta")
          .in("npsn", part);

        if (error) throw error;

        (data || []).forEach((row) => {
          if (row?.npsn)
            metaByNpsn.set(String(row.npsn).trim(), safeObj(row.meta));
        });
      }
    } catch (err) {
      // Jika fetch meta gagal, import masih bisa lanjut (akan overwrite meta murni dari excel/template)
      console.warn(
        "[Service] Gagal mengambil meta existing, lanjut tanpa previousMeta:",
        err?.message || err,
      );
    }

    // 3) Build payload array untuk RPC batch (client-side)
    const payloadRows = new Array(total);

    for (let i = 0; i < total; i++) {
      const rowData = rows[i] || {};
      const npsn = rowData?.npsn != null ? String(rowData.npsn).trim() : "";

      const previousMeta = npsn ? metaByNpsn.get(npsn) : {};

      const payload = buildUpdateSchoolWithRelationsPayload({
        formData: rowData,
        config,
        schoolType,
        kecamatanLabel: rowData.kecamatan || "",
        desaLabel: rowData.desa || "",
        previousMeta: safeObj(previousMeta),
      });

      payloadRows[i] = payload;

      if (onProgress) onProgress(i + 1, total);
    }

    // 4) 1x RPC call: batch upsert
    const { data, error } = await supabase.rpc(
      "batch_upsert_school_with_relations",
      {
        p_school_type: schoolType,
        p_rows: payloadRows,
      },
    );

    if (error) {
      console.error(
        "[Service] batch_upsert_school_with_relations error:",
        error,
      );
      throw new Error(error.message || "Batch import gagal.");
    }

    const successCount = Number(data?.success_count ?? 0);
    const failCount = Number(data?.fail_count ?? 0);

    const rawErrors = Array.isArray(data?.errors) ? data.errors : [];
    const errors = formatBatchErrors(rawErrors);

    return { successCount, failCount, errors, rawErrors };
  },

  /**
   * Alias opsional (jika ingin dipakai nama yang lebih eksplisit)
   */
  async batchUpsertSchools(schoolType, schoolsData, onProgress) {
    return this.batchUpdateSchools(schoolType, schoolsData, onProgress);
  },
};
