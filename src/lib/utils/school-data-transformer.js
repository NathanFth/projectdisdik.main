// src/lib/utils/school-data-transformer.js

/* =========================================
   SCHOOL DATA TRANSFORMER V_FINAL_FIX_FACILITIES
   - FIX: prasarana dibaca dari facilities + class_condition
   - FIX: meta.prasarana tetap prioritas tertinggi
   - FIX: kegiatanFisik: map rehab_unit/pembangunan_unit -> rehabRuangKelas/pembangunanRKB
   ========================================= */

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeParseJson(v) {
  if (v == null) return {};
  if (typeof v === "object") return v; // jsonb dari supabase biasanya sudah object
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(a, b) {
  const A = isPlainObject(a) ? a : {};
  const B = isPlainObject(b) ? b : {};
  const out = { ...A };
  for (const [k, v] of Object.entries(B)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// LOGIKA UTAMA EKSTRAKSI PRASARANA
function extractPrasarana(rawSchool, meta) {
  // 1) Prioritas tertinggi: meta.prasarana (jika ada)
  const pMeta = isPlainObject(meta?.prasarana) ? meta.prasarana : {};

  // 2) Fallback kuat: facilities + class_condition (ini yang selama ini TIDAK dibaca)
  const facilitiesObj = safeParseJson(rawSchool?.facilities);
  const classCondObj = safeParseJson(rawSchool?.class_condition);

  // Samakan seperti SQL Anda:
  // meta.prasarana = deep_merge(facilities, { classrooms: class_condition })
  const pFromFacilities = deepMerge(facilitiesObj, {
    classrooms: isPlainObject(classCondObj) ? classCondObj : {},
  });

  // 3) Legacy fallback (jika suatu saat ada)
  const pRaw = isPlainObject(rawSchool?.prasarana) ? rawSchool.prasarana : {};
  const pJson = safeParseJson(rawSchool?.prasarana_json);

  // 4) Merge final (meta menang terakhir)
  // urutan: facilities/base -> legacy -> meta
  const combined = deepMerge(
    deepMerge(deepMerge(pFromFacilities, pJson), pRaw),
    pMeta,
  );

  // DEBUG: log sumber data
  if (pMeta?.classrooms || pMeta?.rooms) {
    console.log("✅ Transformer: Prasarana dari META.prasarana", pMeta);
  } else if (
    pFromFacilities?.rooms ||
    pFromFacilities?.ukuran ||
    pFromFacilities?.classrooms
  ) {
    console.log(
      "✅ Transformer: Prasarana dari FACILITIES + CLASS_CONDITION",
      pFromFacilities,
    );
  } else if (pRaw?.classrooms || pRaw?.rooms) {
    console.log("⚠️ Transformer: Prasarana dari ROOT/LEGACY", pRaw);
  } else {
    console.warn(
      "❌ Transformer: Prasarana kosong (meta/facilities/legacy kosong).",
    );
  }

  // Helper Stats untuk rooms
  const rs = (obj) => ({
    total: toNum(obj?.total || obj?.total_all || obj?.jumlah),
    good: toNum(obj?.good || obj?.baik || obj?.good_condition),
    rusakRingan: toNum(obj?.rusakRingan || obj?.light_damage),
    moderate_damage: toNum(
      obj?.moderate_damage || obj?.rusakSedang || obj?.rusak_sedang,
    ),
    heavy_damage: toNum(
      obj?.heavy_damage || obj?.rusakBerat || obj?.rusak_berat,
    ),
    rusakTotal: toNum(obj?.rusakTotal || obj?.damage_total || obj?.rusak_total),
  });

  // Helper Stats untuk furniture
  const fs = (obj) => ({
    total: toNum(obj?.total || obj?.jumlah),
    good: toNum(obj?.good || obj?.baik),
    moderate_damage: toNum(obj?.moderate_damage),
    heavy_damage: toNum(obj?.heavy_damage || obj?.rusak),
  });

  // A. KONDISI KELAS
  const cls = isPlainObject(combined?.classrooms) ? combined.classrooms : {};
  const kondisiKelas = {
    total_room:
      toNum(cls.total_room) || toNum(cls.total) || toNum(cls.jumlah) || 0,
    classrooms_good:
      toNum(cls.classrooms_good) || toNum(cls.good) || toNum(cls.baik) || 0,
    rusakRingan: toNum(cls.rusakRingan) || toNum(cls.light_damage) || 0,
    classrooms_moderate_damage:
      toNum(cls.classrooms_moderate_damage) ||
      toNum(cls.moderate_damage) ||
      toNum(cls.rusakSedang) ||
      0,
    heavy_damage: toNum(cls.heavy_damage) || toNum(cls.rusakBerat) || 0,
    rusakTotal: toNum(cls.rusakTotal) || toNum(cls.damage_total) || 0,

    kurangRkb: toNum(cls.kurangRkb),
    kelebihan: toNum(cls.kelebihan),
    rkbTambahan: toNum(cls.rkbTambahan),
    lahan: cls.lahan || combined?.lahan || "-",
  };

  // B. RUANGAN (rooms ada di facilities.rooms)
  const rooms = isPlainObject(combined?.rooms) ? combined.rooms : {};

  // C. MEBEULAIR
  const furn = isPlainObject(combined?.furniture)
    ? combined.furniture
    : isPlainObject(combined?.mebeulair)
      ? combined.mebeulair
      : {};

  // Return prasarana bersih untuk UI
  return {
    ...combined,

    // classrooms sudah dinormalisasi
    classrooms: kondisiKelas,

    // rooms dinormalisasi per item (library, toilets, dsb)
    rooms: {
      ...rooms,
      library: rs(rooms.library || combined?.ruangPerpustakaan),
      laboratory: rs(rooms.laboratory || combined?.ruangLaboratorium),
      teacher_room: rs(rooms.teacher_room || combined?.ruangGuru),
      headmaster_room: rs(rooms.headmaster_room || combined?.ruangKepsek),
      administration_room: rs(rooms.administration_room || combined?.ruangTu),
      uks_room: rs(rooms.uks_room || combined?.ruangUks),
      toilets: rs(rooms.toilets || combined?.toilet),
      official_residences: rs(
        rooms.official_residences || combined?.rumahDinas,
      ),
      ape: rs(rooms.ape),
    },

    furniture: {
      ...furn,
      tables: fs(furn.tables || furn.meja),
      chairs: fs(furn.chairs || furn.kursi),
      whiteboard: fs(furn.whiteboard),
      computer: toNum(furn.computer || furn.komputer),
    },

    chromebook: toNum(combined?.chromebook),
    peralatanRumahTangga: combined?.peralatanRumahTangga || "Baik",

    // ukuran (fallback terakhir jika ada kolom luas_* di rawSchool)
    ukuran: {
      tanah: toNum(combined?.ukuran?.tanah) || toNum(rawSchool?.luas_tanah),
      bangunan:
        toNum(combined?.ukuran?.bangunan) || toNum(rawSchool?.luas_bangunan),
      halaman:
        toNum(combined?.ukuran?.halaman) || toNum(rawSchool?.luas_halaman),
    },
  };
}

function calculateSiswa(rawSchool, meta) {
  let metaL = 0,
    metaP = 0;
  const siswaMeta = meta?.siswa || {};
  Object.values(siswaMeta).forEach((rombel) => {
    if (rombel && typeof rombel === "object") {
      metaL += toNum(rombel.l);
      metaP += toNum(rombel.p);
    }
  });

  const dbL = toNum(rawSchool?.st_male);
  const dbP = toNum(rawSchool?.st_female);
  const dbTotal = toNum(rawSchool?.student_count);

  if (metaL + metaP > 0) return { l: metaL, p: metaP, total: metaL + metaP };
  return { l: dbL, p: dbP, total: dbTotal || dbL + dbP };
}

export function transformSchoolData(rawSchool) {
  if (!rawSchool) return null;

  const meta = safeParseJson(rawSchool.meta) || {};

  const schoolType = (
    rawSchool.schoolType ||
    meta.jenjang ||
    "PAUD"
  ).toUpperCase();

  // FIX kegiatanFisik: dukung rehab_unit/pembangunan_unit tetapi UI Anda cek rehabRuangKelas/pembangunanRKB
  const kegiatanFisikRaw =
    meta?.kegiatanFisik || rawSchool?.kegiatanFisik || {};
  const kegiatanFisik = {
    ...kegiatanFisikRaw,
    // map agar UI tidak 0
    rehabRuangKelas:
      toNum(kegiatanFisikRaw?.rehabRuangKelas) ||
      toNum(kegiatanFisikRaw?.rehab_unit),
    pembangunanRKB:
      toNum(kegiatanFisikRaw?.pembangunanRKB) ||
      toNum(kegiatanFisikRaw?.pembangunan_unit),
    // biarkan rehabToilet/pembangunanToilet jika suatu saat ada
    rehabToilet: toNum(kegiatanFisikRaw?.rehabToilet),
    pembangunanToilet: toNum(kegiatanFisikRaw?.pembangunanToilet),
  };

  const siswaAgg = calculateSiswa(rawSchool, meta);

  return {
    id: rawSchool.id,
    npsn: rawSchool.npsn,
    namaSekolah: rawSchool.name || rawSchool.namaSekolah || "Tanpa Nama",
    status: rawSchool.status || "SWASTA",
    dataStatus: "Aktif",
    lastUpdated: rawSchool.updated_at
      ? new Date(rawSchool.updated_at).toLocaleDateString("id-ID")
      : "-",

    schoolType,
    jenjang: schoolType,
    kecamatan: rawSchool.kecamatan || meta.kecamatan || "-",
    desa: rawSchool.desa || meta.desa || rawSchool.village_name || "-",
    alamat: rawSchool.address || meta.alamat || "",
    latitude: rawSchool.lat,
    longitude: rawSchool.lng,

    student_count: toNum(rawSchool.student_count) || siswaAgg.total,

    // FIX UTAMA: prasarana kini baca facilities + class_condition
    prasarana: extractPrasarana(rawSchool, meta),

    guru: meta.guru || rawSchool.guru || {},
    siswa: meta.siswa || rawSchool.siswa || {},
    siswaAbk: meta.siswaAbk || rawSchool.siswaAbk || {},
    rombel: meta.rombel || rawSchool.rombel || {},

    kelembagaan: meta.kelembagaan || rawSchool.kelembagaan || {},
    kegiatanFisik,

    lulusan: {
      paketA: meta.lulusanPaketA || {},
      paketB: meta.lulusanPaketB || {},
      paketC: meta.lulusanPaketC || {},
      dalamKab: meta.siswaLanjutDalamKab || meta.lanjutDalamKab || {},
      luarKab: meta.siswaLanjutLuarKab || meta.lanjutLuarKab || {},
      tidakLanjut: toNum(meta.siswaTidakLanjut),
      bekerja: toNum(meta.siswaBekerja),
    },
  };
}
