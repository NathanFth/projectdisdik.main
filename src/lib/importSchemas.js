// src/lib/importSchemas.js
//
// Tujuan:
// 1) Skema import per jenjang (PAUD, TK, PKBM, SD, SMP)
// 2) Alias header dibuat luas supaya file Excel “lapangan” yang headernya beda-beda tetap kebaca
// 3) TKPAUD dipertahankan sebagai BACKWARD COMPATIBILITY (kalau masih ada file lama / schemaKey lama)
//
// Konvensi field standar (internal):
// - sekolah, npsn, kecamatan, desa, alamat, tahun, nilai, status, jenjang, program, jenis_bantuan, sumber_dana, keterangan

export const SCHEMA_KEYS = ["PAUD", "TK", "TKPAUD", "PKBM", "SD", "SMP"];

// =========
// ALIAS UMUM
// =========
const commonAliases = {
  sekolah: [
    "nama sekolah",
    "nama_sekolah",
    "sekolah",
    "satuan pendidikan",
    "satuan_pendidikan",
    "nama satuan pendidikan",
    "nama_satuan_pendidikan",
    "nama sp",
    "nama lembaga",
    "nama_lembaga",
    "nama satpen",
  ],

  npsn: [
    "npsn",
    "npsn sekolah",
    "npsn_sekolah",
    "kode sekolah",
    "kode_sekolah",
    "kode sp",
    "kode_sp",
    "npsn (8 digit)",
  ],

  kecamatan: ["kecamatan", "kec", "kec.", "subdistrict", "kecamatan sekolah"],

  desa: [
    "desa",
    "kelurahan",
    "desa/kelurahan",
    "desa_kelurahan",
    "village",
    "desa sekolah",
  ],

  alamat: ["alamat", "alamat sekolah", "alamat_sekolah", "address"],

  tahun: [
    "tahun",
    "thn",
    "tahun anggaran",
    "tahun_anggaran",
    "tahun kegiatan",
    "tahun_kegiatan",
    "tahun pelaksanaan",
    "tahun_pelaksanaan",
    "tahun ajaran",
    "tahun_ajaran",
  ],

  nilai: [
    "nilai",
    "jumlah",
    "jumlah bantuan",
    "jumlah_bantuan",
    "nilai bantuan",
    "nilai_bantuan",
    "nilai anggaran",
    "nilai_anggaran",
    "pagu",
    "pagu anggaran",
    "pagu_anggaran",
    "total",
    "total biaya",
    "total_biaya",
    "anggaran",
    "biaya",
  ],

  status: [
    "status",
    "kondisi",
    "tahap",
    "progress",
    "realisasi",
    "verifikasi",
    "approved",
    "disetujui",
    "ditolak",
    "keterangan status",
  ],

  keterangan: ["keterangan", "catatan", "note", "remarks", "remark"],

  jenjang: ["jenjang", "jenis", "type", "bentuk", "kategori"],

  program: [
    "program",
    "jenis program",
    "jenis_program",
    "paket",
    "paket program",
    "paket_program",
  ],

  jenis_bantuan: [
    "jenis bantuan",
    "jenis_bantuan",
    "nama bantuan",
    "nama_bantuan",
    "kegiatan",
    "nama kegiatan",
    "nama_kegiatan",
  ],

  sumber_dana: [
    "sumber dana",
    "sumber_dana",
    "sumber",
    "sumber anggaran",
    "sumber_anggaran",
    "dana",
  ],
};

// =========
// SKEMA PER JENJANG
// NOTE: wajib dibuat “minimal tapi cukup” supaya tidak bikin user terjebak gara-gara kolom opsional.
// =========
const baseSchoolSchema = {
  // Wajib minimal untuk identifikasi dan rekap
  required: ["sekolah", "npsn", "kecamatan", "tahun", "nilai"],
  optional: [
    "desa",
    "alamat",
    "status",
    "keterangan",
    "jenis_bantuan",
    "sumber_dana",
  ],
  aliases: {
    ...commonAliases,
  },
};

export const IMPORT_SCHEMAS = {
  // ✅ PAUD (non-TK) — tetap sama struktur import, bedanya nanti di pemrosesan/validasi jenjang
  PAUD: {
    ...baseSchoolSchema,
  },

  // ✅ TK
  TK: {
    ...baseSchoolSchema,
  },

  // ✅ Gabungan lama (BACKWARD COMPATIBLE)
  // Dipakai kalau ada file campuran atau sisa schemaKey lama.
  // `jenjang` opsional (kalau diisi, bisa dipakai split baris TK vs PAUD di masa depan).
  TKPAUD: {
    required: ["sekolah", "npsn", "kecamatan", "tahun", "nilai"],
    optional: [
      "desa",
      "alamat",
      "status",
      "keterangan",
      "jenjang",
      "jenis_bantuan",
      "sumber_dana",
    ],
    aliases: {
      ...commonAliases,
    },
  },

  // ✅ PKBM — biasanya juga punya NPSN; kalau di lapangan ada file tanpa NPSN, kita tetap bisa mapping,
  // tapi saat commit nanti NPSN akan diminta/di-generate; untuk saat ini kita tetap required biar aman.
  PKBM: {
    required: ["sekolah", "npsn", "kecamatan", "tahun", "nilai"],
    optional: [
      "desa",
      "alamat",
      "status",
      "keterangan",
      "program",
      "jenis_bantuan",
      "sumber_dana",
    ],
    aliases: {
      ...commonAliases,
    },
  },

  SD: {
    ...baseSchoolSchema,
    // field opsional tambahan bila suatu saat dipakai
    optional: [
      ...baseSchoolSchema.optional,
      "kelas_rusak_berat",
      "kelas_rusak_sedang",
      "jumlah_rombel",
      "jumlah_siswa",
    ],
    aliases: {
      ...commonAliases,
      kelas_rusak_berat: [
        "rusak berat",
        "kelas rusak berat",
        "krb",
        "rb",
        "kerusakan berat",
      ],
      kelas_rusak_sedang: [
        "rusak sedang",
        "kelas rusak sedang",
        "krs",
        "rs",
        "kerusakan sedang",
      ],
      jumlah_rombel: [
        "rombel",
        "jml rombel",
        "jml_rombel",
        "jumlah rombel",
        "jumlah_rombel",
      ],
      jumlah_siswa: [
        "siswa",
        "jml siswa",
        "jml_siswa",
        "jumlah siswa",
        "jumlah_siswa",
        "peserta didik",
      ],
    },
  },

  SMP: {
    ...baseSchoolSchema,
    optional: [
      ...baseSchoolSchema.optional,
      "kelas_rusak_berat",
      "kelas_rusak_sedang",
      "jumlah_rombel",
      "jumlah_siswa",
    ],
    aliases: {
      ...commonAliases,
      kelas_rusak_berat: [
        "rusak berat",
        "kelas rusak berat",
        "krb",
        "rb",
        "kerusakan berat",
      ],
      kelas_rusak_sedang: [
        "rusak sedang",
        "kelas rusak sedang",
        "krs",
        "rs",
        "kerusakan sedang",
      ],
      jumlah_rombel: [
        "rombel",
        "jml rombel",
        "jml_rombel",
        "jumlah rombel",
        "jumlah_rombel",
      ],
      jumlah_siswa: [
        "siswa",
        "jml siswa",
        "jml_siswa",
        "jumlah siswa",
        "jumlah_siswa",
        "peserta didik",
      ],
    },
  },
};

// =====================
// NORMALIZER & MATCHER
// =====================
export function normalizeHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/.-]/g, "") // buang tanda aneh, tapi tetap izinkan / . -
    .trim();
}

export function matchHeaderToField(schema, rawHeader) {
  const norm = normalizeHeader(rawHeader);

  const required = schema?.required || [];
  const optional = schema?.optional || [];
  const allFields = new Set([...required, ...optional]);

  // 1) cocokkan direct (kalau file memang pakai nama field internal)
  for (const f of allFields) {
    if (norm === f) return f;
  }

  // 2) cocokkan lewat alias
  const aliases = schema?.aliases || {};
  for (const [field, aliasList] of Object.entries(aliases)) {
    if (!allFields.has(field)) continue;
    if ((aliasList || []).some((a) => normalizeHeader(a) === norm)) {
      return field;
    }
  }

  return null;
}

export function missingRequiredFields(schema, mappedFieldsSet) {
  return (schema?.required || []).filter((req) => !mappedFieldsSet.has(req));
}
