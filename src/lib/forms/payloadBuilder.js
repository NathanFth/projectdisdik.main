// src/lib/forms/payloadBuilder.js
// -----------------------------------------------------------------------------
// Single Source of Truth untuk membangun payload RPC Supabase
// FIXED:
// 1. Struktur Rooms Nested (Prasarana)
// 2. Filter PAUD dihapus (Agar TK A & TK B muncul/tersimpan)
// 3. UPDATED: Menambah field rusakRingan dan rusakTotal pada normT dan Labs
// -----------------------------------------------------------------------------
//
// PATCH (kegiatanFisik):
// - Normalisasi kegiatanFisik agar selalu menyimpan format baru:
//   rehabRuangKelas, pembangunanRKB, rehabToilet, pembangunanToilet
// - Tetap menerima input legacy: rehab_unit, pembangunan_unit
// - Saat ada input, simpan juga mirror legacy (rehab_unit/pembangunan_unit) agar kompatibel
// - Jika tidak ada input kegiatan fisik sama sekali, JANGAN overwrite meta.kegiatanFisik
// -----------------------------------------------------------------------------

import {
  toNum,
  normalizeStatus,
  normalizeYesNo,
  normalizeSudahBelum,
  normalizePeralatanRumahTangga,
} from "./normalizers";

// -----------------------------------------------------------------------------
// Shared constants
// -----------------------------------------------------------------------------

export const LANJUT_OPTIONS = {
  SD: {
    dalamKab: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    luarKab: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
  },
  SMP: {
    dalamKab: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    luarKab: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
  },
  PAUD: {
    dalamKab: [
      { key: "sd", label: "SD" },
      { key: "mi", label: "MI" },
    ],
    luarKab: [
      { key: "sd", label: "SD" },
      { key: "mi", label: "MI" },
    ],
  },
  PKBM: {
    paketA: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "paketB", label: "Lanjut Paket B" },
    ],
    paketB: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "paketC", label: "Lanjut Paket C" },
    ],
    paketC: [
      { key: "pt", label: "Perguruan Tinggi" },
      { key: "bekerja", label: "Bekerja" },
    ],
  },
};
LANJUT_OPTIONS.TK = LANJUT_OPTIONS.PAUD;

// -----------------------------------------------------------------------------
// Small utils
// -----------------------------------------------------------------------------

export const getValue = (obj, path) => {
  if (!obj) return undefined;
  return String(path || "")
    .split(".")
    .reduce((o, k) => (o ? o[k] : undefined), obj);
};

// ✅ FIX UTAMA: Hapus filter pembatas tipe!
// Kita kembalikan SEMUA tipe rombel yang ada di config, tanpa peduli label TK/PAUD.
export const getActivePaudRombelTypes = (config, schoolType) => {
  if (!config?.isPaud || !config?.rombelTypes) return [];
  // Langsung return semua opsi (TK A, TK B, KB, SPS) agar data tidak hilang
  return config.rombelTypes;
};

// -----------------------------------------------------------------------------
// Student counts
// -----------------------------------------------------------------------------

export const sumSiswaByGender = ({
  formData,
  config,
  activePaudRombelTypes,
  genderKey,
}) => {
  if (!formData || !config) return 0;

  if (config.isPkbm && config.pakets) {
    return Object.entries(config.pakets).reduce((total, [paketKey, paket]) => {
      const grades = Array.isArray(paket?.grades) ? paket.grades : [];
      return (
        total +
        grades.reduce((t, grade) => {
          const val = getValue(
            formData,
            `siswa.paket${paketKey}.kelas${grade}.${genderKey}`,
          );
          return t + (Number(val) || 0);
        }, 0)
      );
    }, 0);
  }

  if (config.isPaud && Array.isArray(activePaudRombelTypes)) {
    return activePaudRombelTypes.reduce((total, type) => {
      const val = getValue(formData, `siswa.${type.key}.${genderKey}`);
      return total + (Number(val) || 0);
    }, 0);
  }

  if (Array.isArray(config.grades) && config.grades.length > 0) {
    return config.grades.reduce((total, grade) => {
      const val = getValue(formData, `siswa.kelas${grade}.${genderKey}`);
      return total + (Number(val) || 0);
    }, 0);
  }

  return 0;
};

export const computeStudentCounts = ({ formData, config, schoolType }) => {
  const activePaudRombelTypes = getActivePaudRombelTypes(config, schoolType);
  const male = sumSiswaByGender({
    formData,
    config,
    activePaudRombelTypes,
    genderKey: "l",
  });
  const female = sumSiswaByGender({
    formData,
    config,
    activePaudRombelTypes,
    genderKey: "p",
  });

  return {
    total: male + female,
    male,
    female,
    activePaudRombelTypes,
  };
};

// -----------------------------------------------------------------------------
// Meta builders
// -----------------------------------------------------------------------------

export const buildRombelMeta = ({ formData, config, schoolType }) => {
  const activePaudRombelTypes = getActivePaudRombelTypes(config, schoolType);
  const meta = { rombel: {} };

  if (config.isPkbm && config.pakets) {
    Object.entries(config.pakets).forEach(([paketKey, paket]) => {
      const grades = Array.isArray(paket?.grades) ? paket.grades : [];
      meta.rombel[`paket${paketKey}`] = {};
      grades.forEach((grade) => {
        const val = getValue(formData, `rombel.paket${paketKey}.kelas${grade}`);
        meta.rombel[`paket${paketKey}`][`kelas${grade}`] = Number(val) || 0;
      });
    });
    return meta;
  }

  if (config.isPaud && activePaudRombelTypes.length > 0) {
    activePaudRombelTypes.forEach((type) => {
      const val = getValue(formData, `rombel.${type.key}`);
      meta.rombel[type.key] = Number(val) || 0;
    });
    return meta;
  }

  if (Array.isArray(config.grades) && config.grades.length > 0) {
    config.grades.forEach((grade) => {
      const val = getValue(formData, `rombel.kelas${grade}`);
      meta.rombel[`kelas${grade}`] = Number(val) || 0;
    });
  }

  return meta;
};

export const buildSiswaMeta = ({ formData, config, schoolType }) => {
  const activePaudRombelTypes = getActivePaudRombelTypes(config, schoolType);
  const metaSiswa = {};

  if (config.isPkbm && config.pakets) {
    Object.entries(config.pakets).forEach(([paketKey, paket]) => {
      const grades = Array.isArray(paket?.grades) ? paket.grades : [];
      metaSiswa[`paket${paketKey}`] = {};
      grades.forEach((grade) => {
        const l = getValue(formData, `siswa.paket${paketKey}.kelas${grade}.l`);
        const p = getValue(formData, `siswa.paket${paketKey}.kelas${grade}.p`);
        metaSiswa[`paket${paketKey}`][`kelas${grade}`] = {
          l: toNum(l),
          p: toNum(p),
        };
      });
    });
    return { siswa: metaSiswa };
  }

  if (config.isPaud && activePaudRombelTypes.length > 0) {
    activePaudRombelTypes.forEach((type) => {
      const l = getValue(formData, `siswa.${type.key}.l`);
      const p = getValue(formData, `siswa.${type.key}.p`);
      metaSiswa[type.key] = { l: toNum(l), p: toNum(p) };
    });
    return { siswa: metaSiswa };
  }

  if (Array.isArray(config.grades) && config.grades.length > 0) {
    config.grades.forEach((grade) => {
      const l = getValue(formData, `siswa.kelas${grade}.l`);
      const p = getValue(formData, `siswa.kelas${grade}.p`);
      metaSiswa[`kelas${grade}`] = { l: toNum(l), p: toNum(p) };
    });
  }

  return { siswa: metaSiswa };
};

export const buildSiswaAbkMeta = ({ formData, config, schoolType }) => {
  const activePaudRombelTypes = getActivePaudRombelTypes(config, schoolType);
  const metaSiswaAbk = {};

  if (config.isPkbm && config.pakets) {
    Object.entries(config.pakets).forEach(([paketKey, paket]) => {
      const grades = Array.isArray(paket?.grades) ? paket.grades : [];
      metaSiswaAbk[`paket${paketKey}`] = {};
      grades.forEach((grade) => {
        const l = getValue(
          formData,
          `siswaAbk.paket${paketKey}.kelas${grade}.l`,
        );
        const p = getValue(
          formData,
          `siswaAbk.paket${paketKey}.kelas${grade}.p`,
        );
        metaSiswaAbk[`paket${paketKey}`][`kelas${grade}`] = {
          l: toNum(l),
          p: toNum(p),
        };
      });
    });
    return { siswaAbk: metaSiswaAbk };
  }

  if (config.isPaud && activePaudRombelTypes.length > 0) {
    activePaudRombelTypes.forEach((type) => {
      const l = getValue(formData, `siswaAbk.${type.key}.l`);
      const p = getValue(formData, `siswaAbk.${type.key}.p`);
      metaSiswaAbk[type.key] = { l: toNum(l), p: toNum(p) };
    });
    return { siswaAbk: metaSiswaAbk };
  }

  if (Array.isArray(config.grades) && config.grades.length > 0) {
    config.grades.forEach((grade) => {
      const l = getValue(formData, `siswaAbk.kelas${grade}.l`);
      const p = getValue(formData, `siswaAbk.kelas${grade}.p`);
      metaSiswaAbk[`kelas${grade}`] = { l: toNum(l), p: toNum(p) };
    });
  }

  return { siswaAbk: metaSiswaAbk };
};

export const buildClassesArray = ({ formData, config, schoolType }) => {
  const classes = [];
  const activePaudRombelTypes = getActivePaudRombelTypes(config, schoolType);
  const isPaud = schoolType === "PAUD" || schoolType === "TK";

  if ((config.isPaud || isPaud) && activePaudRombelTypes.length > 0) {
    activePaudRombelTypes.forEach((type) => {
      const male = Number(getValue(formData, `siswa.${type.key}.l`) || 0);
      const female = Number(getValue(formData, `siswa.${type.key}.p`) || 0);
      if (male > 0)
        classes.push({ grade: `${type.key}_L`, count: male, extra: null });
      if (female > 0)
        classes.push({ grade: `${type.key}_P`, count: female, extra: null });
    });
    return classes;
  }

  if (config.isPkbm && config.pakets) {
    Object.entries(config.pakets).forEach(([paketKey, paket]) => {
      const grades = Array.isArray(paket?.grades) ? paket.grades : [];
      grades.forEach((grade) => {
        const base = `siswa.paket${paketKey}.kelas${grade}`;
        const male = Number(getValue(formData, `${base}.l`) || 0);
        const female = Number(getValue(formData, `${base}.p`) || 0);
        if (male > 0)
          classes.push({
            grade: `paket${paketKey}_kelas${grade}_L`,
            count: male,
            extra: null,
          });
        if (female > 0)
          classes.push({
            grade: `paket${paketKey}_kelas${grade}_P`,
            count: female,
            extra: null,
          });
      });
    });
    return classes;
  }

  if (Array.isArray(config.grades) && config.grades.length > 0) {
    config.grades.forEach((grade) => {
      const male = Number(getValue(formData, `siswa.kelas${grade}.l`) || 0);
      const female = Number(getValue(formData, `siswa.kelas${grade}.p`) || 0);
      if (male > 0)
        classes.push({ grade: `kelas${grade}_L`, count: male, extra: null });
      if (female > 0)
        classes.push({ grade: `kelas${grade}_P`, count: female, extra: null });
    });
  }

  return classes;
};

// -----------------------------------------------------------------------------
// Guru + staff summary
// -----------------------------------------------------------------------------

export const normalizeGuruMeta = (formData) => {
  const g = formData?.guru || {};
  const pns = toNum(g.pns);
  const pppk = toNum(g.pppk);
  const pppkParuhWaktu = toNum(g.pppkParuhWaktu);
  const nonAsnDapodik = toNum(g.nonAsnDapodik);
  const nonAsnTidakDapodik = toNum(g.nonAsnTidakDapodik);

  return {
    jumlahGuru:
      pns + pppk + pppkParuhWaktu + nonAsnDapodik + nonAsnTidakDapodik,
    pns,
    pppk,
    pppkParuhWaktu,
    nonAsnDapodik,
    nonAsnTidakDapodik,
    kekuranganGuru: toNum(g.kekuranganGuru),
  };
};

export const buildStaffSummaryPayload = (guruMeta) => {
  return [
    { role: "guru_pns", count: guruMeta.pns, details: null },
    { role: "guru_pppk", count: guruMeta.pppk, details: null },
    {
      role: "guru_pppk_paruh_waktu",
      count: guruMeta.pppkParuhWaktu,
      details: null,
    },
    {
      role: "guru_non_asn_dapodik",
      count: guruMeta.nonAsnDapodik,
      details: null,
    },
    {
      role: "guru_non_asn_tidak_dapodik",
      count: guruMeta.nonAsnTidakDapodik,
      details: null,
    },
    { role: "guru_kekurangan", count: guruMeta.kekuranganGuru, details: null },
    { role: "guru_total", count: guruMeta.jumlahGuru, details: null },
  ];
};

// -----------------------------------------------------------------------------
// Lanjut
// -----------------------------------------------------------------------------

export const buildLanjutPayload = ({ formData, schoolType }) => {
  const isPkbm = schoolType === "PKBM";

  if (isPkbm) {
    const get = (p) => getValue(formData, p) || {};
    return {
      lulusanPaketA: {
        smp: toNum(get("lanjut.paketA").smp),
        mts: toNum(get("lanjut.paketA").mts),
        pontren: toNum(get("lanjut.paketA").pontren),
        paketB: toNum(get("lanjut.paketA").paketB),
      },
      lulusanPaketB: {
        sma: toNum(get("lanjut.paketB").sma),
        smk: toNum(get("lanjut.paketB").smk),
        ma: toNum(get("lanjut.paketB").ma),
        pontren: toNum(get("lanjut.paketB").pontren),
        paketC: toNum(get("lanjut.paketB").paketC),
      },
      lulusanPaketC: {
        pt: toNum(get("lanjut.paketC").pt),
        bekerja: toNum(get("lanjut.paketC").bekerja),
      },
    };
  }

  return {
    siswaLanjutDalamKab: Object.fromEntries(
      (LANJUT_OPTIONS[schoolType]?.dalamKab || []).map((o) => [
        o.key,
        toNum(getValue(formData, `lanjut.dalamKab.${o.key}`)),
      ]),
    ),
    siswaLanjutLuarKab: Object.fromEntries(
      (LANJUT_OPTIONS[schoolType]?.luarKab || []).map((o) => [
        o.key,
        toNum(getValue(formData, `lanjut.luarKab.${o.key}`)),
      ]),
    ),
    siswaTidakLanjut: toNum(getValue(formData, "lanjut.tidakLanjut")),
    siswaBekerja: toNum(getValue(formData, "lanjut.bekerja")),
  };
};

// -----------------------------------------------------------------------------
// Prasarana + Kegiatan Fisik
// -----------------------------------------------------------------------------

export const buildPrasaranaPayload = ({ formData, schoolType }) => {
  const isSmp = schoolType === "SMP";

  // SAFETY CHECK: Pastikan prasarana selalu object, jangan undefined/null
  const pr = getValue(formData, "prasarana") || {};

  // =========================================================
  // PATCH: Ambil kegiatan fisik dari beberapa kemungkinan path
  // - formData.kegiatanFisik (baru)
  // - formData.meta.kegiatanFisik (jika state pernah tersimpan di meta)
  // - legacy: rehab_unit / pembangunan_unit (jika UI masih pakai key lama)
  // - legacy lain: data_kegiatan_fisik (opsional)
  // =========================================================
  const safeObj = (v) =>
    v && typeof v === "object" && !Array.isArray(v) ? v : {};
  const kfA = safeObj(getValue(formData, "kegiatanFisik"));
  const kfB = safeObj(getValue(formData, "meta.kegiatanFisik"));
  const kfC = safeObj(getValue(formData, "data_kegiatan_fisik"));
  const kfD = safeObj(getValue(formData, "meta.data_kegiatan_fisik"));
  const kg = { ...kfD, ...kfC, ...kfB, ...kfA };

  const isProvided = (v) => {
    if (v === 0 || v === "0") return true;
    if (v === null || v === undefined) return false;
    if (typeof v === "number") return Number.isFinite(v);
    return String(v).trim() !== "";
  };

  const hasKegiatanFisikInput = [
    "rehabRuangKelas",
    "pembangunanRKB",
    "rehabToilet",
    "pembangunanToilet",
    "rehab_unit",
    "pembangunan_unit",
  ].some((k) => isProvided(kg?.[k]));

  // Helper normalizer
  const normT = (x) => ({
    total: toNum(x?.total || x?.total_all),
    good: toNum(x?.good),
    rusakRingan: toNum(x?.rusakRingan),
    moderate_damage: toNum(x?.moderate_damage),
    heavy_damage: toNum(x?.heavy_damage),
    rusakTotal: toNum(x?.rusakTotal),
  });

  const getRoom = (key, legacyKey) => {
    // 1. Cek di rooms (Standard Baru)
    if (pr.rooms && pr.rooms[key]) return pr.rooms[key];
    // 2. Cek di root prasarana (Fallback)
    if (pr[key]) return pr[key];
    // 3. Cek Legacy Indo (Untuk antisipasi input form lama/draft lama)
    if (legacyKey && pr[legacyKey]) return pr[legacyKey];
    return {};
  };

  const labs = pr.labs || {};

  // Logic Labs SMP
  const labPayload = isSmp
    ? {
        laboratory_comp: {
          total_all: toNum(labs?.laboratory_comp?.total_all),
          good: toNum(labs?.laboratory_comp?.good),
          rusakRingan: toNum(labs?.laboratory_comp?.rusakRingan),
          moderate_damage: toNum(labs?.laboratory_comp?.moderate_damage),
          heavy_damage: toNum(labs?.laboratory_comp?.heavy_damage),
          rusakTotal: toNum(labs?.laboratory_comp?.rusakTotal),
        },
        laboratory_langua: {
          total_all: toNum(labs?.laboratory_langua?.total_all),
          good: toNum(labs?.laboratory_langua?.good),
          rusakRingan: toNum(labs?.laboratory_langua?.rusakRingan),
          moderate_damage: toNum(labs?.laboratory_langua?.moderate_damage),
          heavy_damage: toNum(labs?.laboratory_langua?.heavy_damage),
          rusakTotal: toNum(labs?.laboratory_langua?.rusakTotal),
        },
        laboratory_ipa: {
          total_all: toNum(labs?.laboratory_ipa?.total_all),
          good: toNum(labs?.laboratory_ipa?.good),
          rusakRingan: toNum(labs?.laboratory_ipa?.rusakRingan),
          moderate_damage: toNum(labs?.laboratory_ipa?.moderate_damage),
          heavy_damage: toNum(labs?.laboratory_ipa?.heavy_damage),
          rusakTotal: toNum(labs?.laboratory_ipa?.rusakTotal),
        },
        laboratory_fisika: {
          total_all: toNum(labs?.laboratory_fisika?.total_all),
          good: toNum(labs?.laboratory_fisika?.good),
          rusakRingan: toNum(labs?.laboratory_fisika?.rusakRingan),
          moderate_damage: toNum(labs?.laboratory_fisika?.moderate_damage),
          heavy_damage: toNum(labs?.laboratory_fisika?.heavy_damage),
          rusakTotal: toNum(labs?.laboratory_fisika?.rusakTotal),
        },
        laboratory_biologi: {
          total_all: toNum(labs?.laboratory_biologi?.total_all),
          good: toNum(labs?.laboratory_biologi?.good),
          rusakRingan: toNum(labs?.laboratory_biologi?.rusakRingan),
          moderate_damage: toNum(labs?.laboratory_biologi?.moderate_damage),
          heavy_damage: toNum(labs?.laboratory_biologi?.heavy_damage),
          rusakTotal: toNum(labs?.laboratory_biologi?.rusakTotal),
        },
      }
    : {};

  const lahanVal = getValue(formData, "prasarana.classrooms.lahan") || "Ada";
  const furn = pr.furniture || pr.mebeulair || {};

  // BUILD FINAL OBJECT
  const prasaranaObj = {
    ukuran: {
      tanah: toNum(pr?.ukuran?.tanah),
      bangunan: toNum(pr?.ukuran?.bangunan),
      halaman: toNum(pr?.ukuran?.halaman),
    },
    gedung: { jumlah: toNum(pr?.gedung?.jumlah) },
    classrooms: {
      total_room: toNum(pr.classrooms?.total_room),
      classrooms_good: toNum(pr.classrooms?.classrooms_good),
      rusakRingan: toNum(pr.classrooms?.rusakRingan),
      classrooms_moderate_damage: toNum(
        pr.classrooms?.classrooms_moderate_damage,
      ),
      heavy_damage: toNum(pr.classrooms?.heavy_damage),
      rusakTotal: toNum(pr.classrooms?.rusakTotal),
      kurangRkb: toNum(pr.classrooms?.kurangRkb),
      kelebihan: toNum(pr.classrooms?.kelebihan),
      rkbTambahan: toNum(pr.classrooms?.rkbTambahan),
      lahan: lahanVal,
    },
    ...labPayload,
    teachers_toilet: {
      male: normT(pr.teachers_toilet?.male),
      female: normT(pr.teachers_toilet?.female),
    },
    students_toilet: {
      male: normT(pr.students_toilet?.male),
      female: normT(pr.students_toilet?.female),
    },
    rooms: {
      library: normT(getRoom("library", "ruangPerpustakaan")),
      laboratory: normT(getRoom("laboratory", "ruangLaboratorium")),
      teacher_room: normT(getRoom("teacher_room", "ruangGuru")),
      headmaster_room: normT(getRoom("headmaster_room", "ruangKepsek")),
      administration_room: normT(getRoom("administration_room", "ruangTu")),
      ape: normT(getRoom("ape")),
      uks_room: normT(getRoom("uks_room", "ruangUks")),
      toilets: normT(getRoom("toilets", "toiletGuruSiswa")),
      official_residences: normT(getRoom("official_residences", "rumahDinas")),
    },
    mebeulair: {
      tables: normT(furn.tables || furn.meja),
      chairs: normT(furn.chairs || furn.kursi),
      whiteboard: normT(furn.whiteboard),
      computer: toNum(furn.computer || furn.komputer),
    },
    chromebook: toNum(pr.chromebook),
    peralatanRumahTangga: normalizePeralatanRumahTangga(
      pr.peralatanRumahTangga,
    ),
  };

  // =========================================================
  // PATCH: kegiatanFisik hanya disertakan jika user benar-benar mengisi.
  // Normalisasi:
  // - sumber baru: rehabRuangKelas / pembangunanRKB / rehabToilet / pembangunanToilet
  // - fallback legacy: rehab_unit / pembangunan_unit
  // - mirror legacy disimpan agar kompatibel consumer lama
  // =========================================================
  if (hasKegiatanFisikInput) {
    const rehabRuangKelas = toNum(
      isProvided(kg.rehabRuangKelas) ? kg.rehabRuangKelas : kg.rehab_unit,
    );
    const pembangunanRKB = toNum(
      isProvided(kg.pembangunanRKB) ? kg.pembangunanRKB : kg.pembangunan_unit,
    );
    const rehabToilet = toNum(kg.rehabToilet);
    const pembangunanToilet = toNum(kg.pembangunanToilet);

    return {
      prasarana: prasaranaObj,
      kegiatanFisik: {
        rehabRuangKelas,
        pembangunanRKB,
        rehabToilet,
        pembangunanToilet,
        // mirror legacy (agar tidak merusak consumer lama)
        rehab_unit: rehabRuangKelas,
        pembangunan_unit: pembangunanRKB,
      },
    };
  }

  // Default: hanya prasarana, kegiatanFisik tidak diubah (menghindari overwrite data lama)
  return { prasarana: prasaranaObj };
};

// -----------------------------------------------------------------------------
// Kelembagaan
// -----------------------------------------------------------------------------

export const buildKelembagaanPayload = ({ formData }) => {
  const k = getValue(formData, "kelembagaan") || {};
  return {
    kelembagaan: {
      pembinaan: normalizeSudahBelum(k.pembinaan),
      asesmen: normalizeSudahBelum(k.asesmen),
      menyelenggarakanBelajar: normalizeYesNo(k.menyelenggarakanBelajar),
      melaksanakanRekomendasi: normalizeYesNo(k.melaksanakanRekomendasi),
      siapDievaluasi: normalizeYesNo(k.siapDievaluasi),
      bop: {
        pengelola: normalizeYesNo(k.bop?.pengelola),
        tenagaPeningkatan: toNum(k.bop?.tenagaPeningkatan),
      },
      perizinan: {
        pengendalian: normalizeYesNo(k.perizinan?.pengendalian),
        kelayakan: normalizeYesNo(k.perizinan?.kelayakan),
      },
      kurikulum: {
        silabus: normalizeYesNo(k.kurikulum?.silabus),
        kompetensiDasar: normalizeYesNo(k.kurikulum?.kompetensiDasar),
      },
    },
  };
};

// -----------------------------------------------------------------------------
// Location builder
// -----------------------------------------------------------------------------

export const buildLocationPayload = ({
  formData,
  kecamatanLabel,
  desaLabel,
}) => {
  const kecamatanName = formData.kecamatan || kecamatanLabel || "";
  const desaName = formData.desa || desaLabel || "";
  return {
    province: "Jawa Barat",
    district: "Garut",
    subdistrict: kecamatanName,
    village: desaName,
    extra: {
      address_detail: formData.alamat || "",
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      kecamatan_code: formData.kecamatan_code || null,
      desa_code: formData.desa_code || null,
    },
  };
};

// -----------------------------------------------------------------------------
// High-level payload builders (insert / update)
// -----------------------------------------------------------------------------

export const buildInsertSchoolWithRelationsPayload = ({
  formData,
  config,
  schoolType,
  kecamatanLabel,
  desaLabel,
}) => {
  if (!formData) throw new Error("formData kosong");
  if (!config) throw new Error("config kosong");
  if (!schoolType) throw new Error("schoolType kosong");

  const { total, male, female } = computeStudentCounts({
    formData,
    config,
    schoolType,
  });
  const location = buildLocationPayload({
    formData,
    kecamatanLabel,
    desaLabel,
  });
  const guruMeta = normalizeGuruMeta(formData);
  const kecamatanName = formData.kecamatan || kecamatanLabel || "";
  const desaName = formData.desa || desaLabel || "";

  const school = {
    npsn: formData.npsn,
    name: formData.namaSekolah,
    address: formData.alamat || "",
    village_name: desaName,
    kecamatan: kecamatanName,
    school_type_id: config.schoolTypeId ?? null,
    status: normalizeStatus(formData.status),
    student_count: total,
    st_male: male,
    st_female: female,
    lat: formData.latitude ? Number(formData.latitude) : null,
    lng: formData.longitude ? Number(formData.longitude) : null,
    facilities: null,
    class_condition: null,
    meta: {
      ...buildSiswaMeta({ formData, config, schoolType }),
      ...buildSiswaAbkMeta({ formData, config, schoolType }),
      ...buildRombelMeta({ formData, config, schoolType }),
      jenjang: schoolType,
      kecamatan: kecamatanName,
      desa: desaName,
      kecamatan_code: formData.kecamatan_code || null,
      desa_code: formData.desa_code || null,
      alamat: formData.alamat || "",
      is_paud: config.isPaud || false,
      monthly_report_file: formData.monthly_report_file || null,
      bantuan_received: formData.bantuan_received || "",
      guru: guruMeta,
      is_test: formData.is_test ?? false,
      ...buildLanjutPayload({ formData, schoolType }),
      ...buildPrasaranaPayload({ formData, schoolType }),
      ...buildKelembagaanPayload({ formData }),
    },
    contact: {
      operator_name: formData.namaOperator || "",
      operator_phone: formData.hp || "",
    },
  };

  return {
    location,
    school,
    classes: buildClassesArray({ formData, config, schoolType }),
    staff_summary: buildStaffSummaryPayload(guruMeta),
  };
};

export const buildUpdateSchoolWithRelationsPayload = ({
  formData,
  config,
  schoolType,
  kecamatanLabel,
  desaLabel,
  previousMeta,
}) => {
  if (!formData) throw new Error("formData kosong");
  if (!config) throw new Error("config kosong");
  if (!schoolType) throw new Error("schoolType kosong");

  const prev =
    previousMeta && typeof previousMeta === "object" ? previousMeta : {};
  const { total, male, female } = computeStudentCounts({
    formData,
    config,
    schoolType,
  });
  const location = buildLocationPayload({
    formData,
    kecamatanLabel,
    desaLabel,
  });
  const guruMeta = normalizeGuruMeta(formData);
  const kecamatanName = formData.kecamatan || kecamatanLabel || "";
  const desaName = formData.desa || desaLabel || "";

  const school = {
    npsn: formData.npsn,
    name: formData.namaSekolah,
    address: formData.alamat || "",
    village_name: desaName,
    kecamatan: kecamatanName,
    school_type_id: config.schoolTypeId ?? null,
    status: normalizeStatus(formData.status),
    student_count: total,
    st_male: male,
    st_female: female,
    lat: formData.latitude ? Number(formData.latitude) : null,
    lng: formData.longitude ? Number(formData.longitude) : null,
    meta: {
      ...prev,
      ...buildSiswaMeta({ formData, config, schoolType }),
      ...buildSiswaAbkMeta({ formData, config, schoolType }),
      ...buildRombelMeta({ formData, config, schoolType }),
      ...buildLanjutPayload({ formData, schoolType }),
      ...buildPrasaranaPayload({ formData, schoolType }),
      ...buildKelembagaanPayload({ formData }),
      kecamatan: kecamatanName,
      desa: desaName,
      kecamatan_code: formData.kecamatan_code || null,
      desa_code: formData.desa_code || null,
      alamat: formData.alamat || "",
      is_paud: config.isPaud || false,
      guru: guruMeta,
      jenjang: schoolType,
    },
    contact: {
      operator_name: formData.namaOperator || "",
      operator_phone: formData.hp || "",
    },
  };

  return {
    location,
    school,
    classes: buildClassesArray({ formData, config, schoolType }),
    staff_summary: buildStaffSummaryPayload(guruMeta),
  };
};
