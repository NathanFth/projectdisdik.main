// src/lib/forms/normalizers.js
// -----------------------------------------------------------------------------
// Single Source of Truth untuk normalisasi enum/string dari input form & Excel.
// Dipakai oleh DataInputForm dan EditSchoolForm.
// -----------------------------------------------------------------------------

/**
 * Konversi nilai ke number yang aman.
 * - String angka -> number
 * - NaN / Infinity -> 0
 * - null/undefined/empty -> 0
 */
export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Normalisasi Status Sekolah.
 * Input yang didukung: "negeri", "swasta", "NEGERI", "SWASTA"
 * Output: "NEGERI" | "SWASTA" | "UNKNOWN" | <UPPERCASE LAINNYA>
 */
export const normalizeStatus = (v) => {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "UNKNOWN";
  if (s === "negeri") return "NEGERI";
  if (s === "swasta") return "SWASTA";
  return s.toUpperCase();
};

/**
 * Normalisasi Ya/Tidak.
 * Input yang didukung: "ya", "tidak", "YA", "TIDAK"
 * Output: "YA" | "TIDAK" | "" | <UPPERCASE LAINNYA>
 */
export const normalizeYesNo = (v) => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s === "ya") return "YA";
  if (s === "tidak") return "TIDAK";
  return s.toUpperCase();
};

/**
 * Normalisasi Sudah/Belum.
 * Juga menerima "ya/tidak" (untuk kompatibilitas import excel/user input).
 * Output: "SUDAH" | "BELUM" | "" | <UPPERCASE LAINNYA>
 */
export const normalizeSudahBelum = (v) => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s === "sudah") return "SUDAH";
  if (s === "belum") return "BELUM";
  if (s === "ya") return "SUDAH";
  if (s === "tidak") return "BELUM";
  return s.toUpperCase();
};

/**
 * Normalisasi enum kondisi Peralatan Rumah Tangga.
 * Output: "TIDAK_MEMILIKI" | "HARUS_DIGANTI" | "BAIK" | "PERLU_REHABILITASI" | "" | <UPPERCASE LAINNYA>
 */
export const normalizePeralatanRumahTangga = (v) => {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const s = raw.toLowerCase();

  if (s === "baik") return "BAIK";
  if (s === "tidak memiliki" || s === "tidak_memiliki") return "TIDAK_MEMILIKI";
  if (s === "harus diganti" || s === "harus_diganti") return "HARUS_DIGANTI";
  if (s === "perlu rehabilitasi" || s === "perlu_rehabilitasi")
    return "PERLU_REHABILITASI";

  return raw.toUpperCase();
};

// -----------------------------------------------------------------------------
// Options untuk Select (dipakai UI layer). Disimpan di sini agar konsisten.
// -----------------------------------------------------------------------------

export const STATUS_OPTIONS = [
  { value: "NEGERI", label: "Negeri" },
  { value: "SWASTA", label: "Swasta" },
];

export const YESNO_OPTIONS = [
  { value: "YA", label: "Ya" },
  { value: "TIDAK", label: "Tidak" },
];

export const SUDAH_BELUM_OPTIONS = [
  { value: "SUDAH", label: "Sudah" },
  { value: "BELUM", label: "Belum" },
];

export const PERALATAN_RUMAH_TANGGA_OPTIONS = [
  { value: "TIDAK_MEMILIKI", label: "Tidak Memiliki" },
  { value: "HARUS_DIGANTI", label: "Harus Diganti" },
  { value: "BAIK", label: "Baik" },
  { value: "PERLU_REHABILITASI", label: "Perlu Rehabilitasi" },
];

export const LAHAN_OPTIONS = [
  { value: "ADA", label: "Ada" },
  { value: "TIDAK_ADA", label: "Tidak Ada" },
  { value: "TIDAK_TAHU", label: "Tidak Tahu" },
];
