// src/lib/config/schoolConfig.js

export const schoolConfigs = {
  SD: {
    schoolTypeId: 3,
    grades: [1, 2, 3, 4, 5, 6],
    lanjutDalamKabOptions: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    lanjutLuarKabOptions: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    lanjutDalamKabLabel: "Lanjut Dalam Kab.",
    lanjutLuarKabLabel: "Lanjut Luar Kab.",
  },

  SMP: {
    schoolTypeId: 4,
    grades: [7, 8, 9],
  },

  TK: {
    schoolTypeId: 1,
    isPaud: true,
    rombelTypes: [
      { key: "tka", label: "TK A" },
      { key: "tkb", label: "TK B" },
      { key: "kb", label: "Kelompok Bermain (KB)" },
      { key: "sps_tpa", label: "SPS/TPA" },
    ],
  },

  PAUD: {
    schoolTypeId: 1,
    isPaud: true,
    rombelTypes: [
      { key: "tka", label: "TK A" },
      { key: "tkb", label: "TK B" },
      { key: "kb", label: "Kelompok Bermain (KB)" },
      { key: "sps_tpa", label: "SPS/TPA" },
    ],
  },

  PKBM: {
    schoolTypeId: 2,
    isPkbm: true,
    pakets: {
      A: { name: "Paket A (Setara SD)", grades: [1, 2, 3, 4, 5, 6] },
      B: { name: "Paket B (Setara SMP)", grades: [7, 8, 9] },
      C: { name: "Paket C (Setara SMA)", grades: [10, 11, 12] },
    },
    lanjutPaketA: [
      { key: "smp", label: "SMP" },
      { key: "mts", label: "MTs" },
      { key: "pontren", label: "Pontren" },
      { key: "paketB", label: "Lanjut Paket B" },
    ],
    lanjutPaketB: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "paketC", label: "Lanjut Paket C" },
    ],
    lanjutPaketC: [
      { key: "pt", label: "Perguruan Tinggi" },
      { key: "bekerja", label: "Bekerja" },
      { key: "wirausaha", label: "Wirausaha" },
      { key: "lainnya", label: "Lainnya" },
    ],
  },

  default: {
    schoolTypeId: null,
    grades: [],
  },
};

schoolConfigs["PKBM Terpadu"] = schoolConfigs.PKBM;

export const createInitialFormData = (config) => {
  const baseData = {
    noUrut: "",
    noUrutSekolah: "",
    kecamatan: "",
    kecamatan_code: "",
    desa: "",
    desa_code: "",
    alamat: "",
    latitude: "",
    longitude: "",
    namaOperator: "",
    hp: "",
    bantuan_received: "",
    monthly_report_file: null,

    npsn: "",
    namaSekolah: "",
    status: "Swasta",

    siswa: { jumlahSiswa: "" },
    siswaAbk: {},
    rombel: {},

    // UPDATE: Struktur disesuaikan dengan InfrastructureSection.jsx (English Keys)
    // Menambahkan rusakRingan dan rusakTotal pada semua sub-objek
    prasarana: {
      ukuran: { tanah: "", bangunan: "", halaman: "" },
      gedung: { jumlah: "" },

      classrooms: {
        total_room: "",
        classrooms_good: "",
        rusakRingan: "",
        classrooms_moderate_damage: "",
        heavy_damage: "",
        rusakTotal: "",
        kelebihan: "",
        kurangRkb: "",
        rkbTambahan: "",
        lahan: "Ada",
      },

      labs: {
        laboratory_comp: {
          total_all: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        laboratory_langua: {
          total_all: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        laboratory_ipa: {
          total_all: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        laboratory_fisika: {
          total_all: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        laboratory_biologi: {
          total_all: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
      },

      teachers_toilet: {
        male: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        female: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
      },
      students_toilet: {
        male: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        female: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
      },

      rooms: {
        library: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        laboratory: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        teacher_room: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        headmaster_room: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        // ADDED: Ruang Tata Usaha
        administration_room: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        uks_room: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        toilets: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        official_residences: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        ape: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
      },

      furniture: {
        tables: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        chairs: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        whiteboard: {
          total: "",
          good: "",
          rusakRingan: "",
          moderate_damage: "",
          heavy_damage: "",
          rusakTotal: "",
        },
        computer: "",
      },

      chromebook: "",
      peralatanRumahTangga: "Baik",
    },

    kegiatanFisik: {
      rehabRuangKelas: "",
      pembangunanRKB: "",
      rehabToilet: "",
      pembangunanToilet: "",
    },

    kelembagaan: {
      pembinaan: "Belum",
      asesmen: "Belum",
      bop: { pengelola: "", tenagaPeningkatan: 0 },
      menyelenggarakanBelajar: "Tidak",
      melaksanakanRekomendasi: "Tidak",
      siapDievaluasi: "Tidak",
      perizinan: { pengendalian: "", kelayakan: "" },
      kurikulum: { silabus: "", kompetensiDasar: "" },
    },

    guru: {
      pns: "",
      pppk: "",
      pppkParuhWaktu: "",
      nonAsnDapodik: "",
      nonAsnTidakDapodik: "",
      kekuranganGuru: "",
    },

    lanjutDalamKab: {},
    lanjutLuarKab: {},
    lulusanPaketB: {},
    lulusanPaketC: {},
  };

  if (config.isPkbm) {
    baseData.siswa.paketA = {};
    baseData.siswa.paketB = {};
    baseData.siswa.paketC = {};

    baseData.siswaAbk.paketA = {};
    baseData.siswaAbk.paketB = {};
    baseData.siswaAbk.paketC = {};

    baseData.rombel.paketA = {};
    baseData.rombel.paketB = {};
    baseData.rombel.paketC = {};

    baseData.lulusanPaketA = {};
    baseData.lulusanPaketB = {};
    baseData.lulusanPaketC = {};

    Object.entries(config.pakets || {}).forEach(([paketKey, paket]) => {
      const paketName = `paket${paketKey}`;
      (paket.grades || []).forEach((grade) => {
        baseData.siswa[paketName][`kelas${grade}`] = { l: "", p: "" };
        baseData.siswaAbk[paketName][`kelas${grade}`] = { l: "", p: "" };
        baseData.rombel[paketName][`kelas${grade}`] = "";
      });
    });

    (config.lanjutPaketA || []).forEach((opt) => {
      baseData.lulusanPaketA[opt.key] = "";
    });
    (config.lanjutPaketB || []).forEach((opt) => {
      baseData.lulusanPaketB[opt.key] = "";
    });
    (config.lanjutPaketC || []).forEach((opt) => {
      baseData.lulusanPaketC[opt.key] = "";
    });
  } else if (config.isPaud && config.rombelTypes) {
    config.rombelTypes.forEach((t) => {
      baseData.siswa[t.key] = { l: "", p: "" };
      baseData.siswaAbk[t.key] = { l: "", p: "" };
      baseData.rombel[t.key] = "";
    });
  } else if (config.grades) {
    config.grades.forEach((grade) => {
      baseData.siswa[`kelas${grade}`] = { l: "", p: "" };
      baseData.siswaAbk[`kelas${grade}`] = { l: "", p: "" };
      baseData.rombel[`kelas${grade}`] = "";
    });

    (config.lanjutDalamKabOptions || []).forEach((opt) => {
      baseData.lanjutDalamKab[opt.key] = "";
    });
    (config.lanjutLuarKabOptions || []).forEach((opt) => {
      baseData.lanjutLuarKab[opt.key] = "";
    });
  }

  return baseData;
};