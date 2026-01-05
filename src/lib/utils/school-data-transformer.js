// src/lib/school-data-transformer.js
/* =========================================
   SCHOOL DATA TRANSFORMER V11 (Updated for Kegiatan Fisik)
   ========================================= */

// --- 1. CORE HELPERS ---
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeParseJson(v) {
  if (v == null) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

function isPlainObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

// Helper: Cari nilai maksimal dari variasi key
function findMax(obj, ...keys) {
  if (!obj || typeof obj !== "object") return 0;
  let max = 0;
  keys.forEach((k) => {
    const val = toNum(obj[k]);
    if (val > max) max = val;
  });
  return max;
}

// Helper: Resolve value dengan prioritas (Raw > Meta)
function resolveValue(raw, meta, key) {
  if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  if (meta[key] !== undefined && meta[key] !== null) return meta[key];
  return null;
}

// --- 2. CALCULATOR SISWA (3 Layer Check) ---
function calculateSiswa(rawSchool, meta, classesRows) {
  // Layer 1: Hitung dari tabel relasi school_classes (Paling Akurat)
  let classL = 0,
    classP = 0,
    classTotal = 0;
  let hasClassData = false;

  if (Array.isArray(classesRows) && classesRows.length > 0) {
    classesRows.forEach((row) => {
      const grade = (row.grade || "").toLowerCase(); // ex: "tka_L"
      const count = toNum(row.count);
      classTotal += count;

      // Deteksi _L / _P (Sesuai DataInputForm: `${type.key}_L`)
      if (grade.endsWith("_l") || grade.endsWith(" l")) classL += count;
      else if (grade.endsWith("_p") || grade.endsWith(" p")) classP += count;
    });
    if (classTotal > 0) hasClassData = true;
  }

  // Layer 2: Hitung dari JSON Meta (Sesuai DataInputForm: meta.siswa.tka.l)
  let metaL = 0,
    metaP = 0;
  const siswaMeta = meta.siswa || {};
  Object.values(siswaMeta).forEach((rombel) => {
    if (isPlainObject(rombel)) {
      metaL += toNum(rombel.l);
      metaP += toNum(rombel.p);
    }
  });
  const metaTotal = metaL + metaP;

  // Layer 3: Kolom Database Flat
  const dbL = toNum(rawSchool.st_male);
  const dbP = toNum(rawSchool.st_female);
  const dbTotal = toNum(rawSchool.student_count);

  // KEPUTUSAN FINAL (Prioritas: Class > Meta > DB)
  if (hasClassData) return { l: classL, p: classP, total: classTotal };
  if (metaTotal > 0) return { l: metaL, p: metaP, total: metaTotal };

  // Fallback terakhir
  return { l: dbL, p: dbP, total: dbTotal > 0 ? dbTotal : dbL + dbP };
}

// --- 3. PRASARANA LOGIC (Based on DataInputForm Structure) ---
function extractPrasarana(rawSchool, meta) {
  // Ambil object prasarana dari meta (karena DataInputForm menyimpannya di meta)
  const pMeta = meta.prasarana || {};
  const pRaw =
    typeof rawSchool.prasarana === "object" ? rawSchool.prasarana : {};
  const pJson = safeParseJson(rawSchool.prasarana_json);

  // Gabungkan semua source, prioritas ke Meta karena itu hasil input form terbaru
  const combined = { ...pJson, ...pRaw, ...pMeta };

  // A. KONDISI KELAS (Mapping dari 'classrooms')
  const cls = combined.classrooms || {};
  const kondisiKelas = {
    total: findMax(cls, "total_room", "total", "jumlah"),
    baik: findMax(cls, "classrooms_good", "good", "baik"),
    // Mapping kunci sesuai DataInputForm:
    rusakRingan: findMax(cls, "rusakRingan", "light_damage"),
    rusakSedang: findMax(
      cls,
      "classrooms_moderate_damage",
      "moderate_damage",
      "rusakSedang"
    ),
    rusakBerat: findMax(cls, "heavy_damage", "rusakBerat"),
    rusakTotal: findMax(cls, "rusakTotal", "damage_total"),

    // Analisis & Lahan
    kurangRkb: findMax(cls, "kurangRkb"),
    kelebihan: findMax(cls, "kelebihan"),
    rkbTambahan: findMax(cls, "rkbTambahan"),
    lahan: cls.lahan || combined.lahan || "-", // ✅ Fix Ketersediaan Lahan
  };

  // B. MEBEULAIR (Mapping dari 'furniture' atau 'mebeulair')
  const furn = combined.furniture || combined.mebeulair || {};
  const mebeulair = {
    meja: {
      total: findMax(furn.tables, "total"),
      baik: findMax(furn.tables, "good"),
      rusak:
        findMax(furn.tables, "moderate_damage") +
        findMax(furn.tables, "heavy_damage"),
    },
    kursi: {
      total: findMax(furn.chairs, "total"),
      baik: findMax(furn.chairs, "good"),
      rusak:
        findMax(furn.chairs, "moderate_damage") +
        findMax(furn.chairs, "heavy_damage"),
    },
    // ✅ Fix Chromebook: Diambil dari root prasarana (sesuai input form)
    chromebook: findMax(combined, "chromebook"),
    komputer: findMax(furn, "computer"),
  };

  // C. RUANGAN LAIN & LABS
  // Kita kembalikan object combined agar UI bisa akses 'library', 'labs', dll langsung
  return {
    ...combined,
    kondisiKelas,
    mebeulair,
    // Pastikan ukuran ada
    ukuran: {
      tanah:
        findMax(combined.ukuran, "tanah") ||
        toNum(rawSchool.luas_tanah) ||
        toNum(rawSchool.luasTanah),
      bangunan:
        findMax(combined.ukuran, "bangunan") ||
        toNum(rawSchool.luas_bangunan) ||
        toNum(rawSchool.luasBangunan),
      halaman:
        findMax(combined.ukuran, "halaman") ||
        toNum(rawSchool.luas_halaman) ||
        toNum(rawSchool.luasHalaman),
    },
  };
}

// --- 4. GURU NORMALIZER ---
function normalizeGuru(school, meta) {
  const g = meta.guru || school.guru || {};
  // Mapping langsung sesuai DataInputForm: normalizeGuru
  return {
    jumlahGuru: toNum(g.jumlahGuru) || toNum(g.total),
    pns: toNum(g.pns),
    pppk: toNum(g.pppk),
    pppkParuhWaktu: toNum(g.pppkParuhWaktu),
    nonAsnDapodik: toNum(g.nonAsnDapodik),
    nonAsnTidakDapodik: toNum(g.nonAsnTidakDapodik),
    kekuranganGuru: toNum(g.kekuranganGuru),
  };
}

// --- 5. MAIN TRANSFORMER ---
export function transformSchoolData(rawSchool, rawClasses = []) {
  if (!rawSchool) return null;

  const meta = safeParseJson(rawSchool.meta) || {};
  const schoolTypeRaw = rawSchool.schoolType || meta.jenjang || "PAUD";
  const schoolType =
    typeof schoolTypeRaw === "string" ? schoolTypeRaw.toUpperCase() : "PAUD";

  // 1. Hitung Siswa (Menggunakan Logic Layered)
  const siswaFinal = calculateSiswa(rawSchool, meta, rawClasses);

  // 2. Olah Prasarana
  const prasaranaFinal = extractPrasarana(rawSchool, meta);

  // 3. Olah Lulusan & Kegiatan (Sesuai DataInputForm)
  const lulusanFinal = {
    paketA: meta.lulusanPaketA || {},
    paketB: meta.lulusanPaketB || {},
    paketC: meta.lulusanPaketC || {},
    dalamKab: meta.siswaLanjutDalamKab || {},
    luarKab: meta.siswaLanjutLuarKab || {},
    tidakLanjut: toNum(meta.siswaTidakLanjut),
    bekerja: toNum(meta.siswaBekerja),
  };

  // ✅ Extract Kegiatan Fisik (Prioritas ke Meta)
  const kegiatanFinal = meta.kegiatanFisik || rawSchool.kegiatanFisik || {};

  return {
    id: rawSchool.id,
    npsn: rawSchool.npsn,
    namaSekolah: rawSchool.name || rawSchool.namaSekolah || "Tanpa Nama",
    status: rawSchool.status || "SWASTA",
    dataStatus: siswaFinal.total > 0 ? "Aktif" : "Data Belum Lengkap",
    lastUpdated: rawSchool.updated_at
      ? new Date(rawSchool.updated_at).toLocaleDateString("id-ID")
      : "-",

    schoolType: schoolType,
    jenjang: schoolType,
    kecamatan: rawSchool.kecamatan || meta.kecamatan || "-",
    alamat: rawSchool.address || meta.alamat || "",
    latitude: rawSchool.lat,
    longitude: rawSchool.lng,

    // ✅ HASIL HITUNGAN SISWA
    student_count: siswaFinal.total,
    st_male: siswaFinal.l,
    st_female: siswaFinal.p,

    guru: normalizeGuru(rawSchool, meta),

    prasarana: prasaranaFinal,
    kegiatanFisik: kegiatanFinal,
    kelembagaan: {
      ...(meta.kelembagaan || {}),
      ...(rawSchool.kelembagaan || {}),
    },
    lulusan: lulusanFinal,

    // Raw Data untuk Tab Detail
    siswa: meta.siswa || rawSchool.siswa || {},
    rombel: meta.rombel || rawSchool.rombel || {},
    siswaAbk: meta.siswaAbk || rawSchool.siswaAbk || {},
  };
}
