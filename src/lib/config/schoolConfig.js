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

  // Catatan DB kamu: tidak ada school_types "TK".
  // Jadi TK dan PAUD harus share school_type_id yang sama (PAUD=1),
  // pembeda TK vs PAUD mestinya dari jenjang/meta (mis. meta.jenjang).
  TK: {
    schoolTypeId: 1, // ✅ PAUD di DB
    isPaud: true,
    rombelTypes: [
      { key: "tka", label: "TK A" },
      { key: "tkb", label: "TK B" },
      { key: "kb", label: "Kelompok Bermain (KB)" },
      { key: "sps_tpa", label: "SPS/TPA" },
    ],
  },

  PAUD: {
    schoolTypeId: 1, // ✅ FIX: PAUD di DB kamu = 1 (bukan 2)
    isPaud: true,
    rombelTypes: [
      { key: "tka", label: "TK A" },
      { key: "tkb", label: "TK B" },
      { key: "kb", label: "Kelompok Bermain (KB)" },
      { key: "sps_tpa", label: "SPS/TPA" },
    ],
  },

  PKBM: {
    schoolTypeId: 2, // ✅ FIX: PKBM di DB kamu = 2 (bukan 5)
    isPkbm: true,
    pakets: {
      A: { name: "Paket A (Setara SD)", grades: [1, 2, 3, 4, 5, 6] },
      B: { name: "Paket B (Setara SMP)", grades: [7, 8, 9] },
      C: { name: "Paket C (Setara SMA)", grades: [10, 11, 12] },
    },
    lanjutPaketB: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
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

// alias “PKBM Terpadu” -> PKBM (biar kompatibel kalau ada pemanggilan lama)
schoolConfigs["PKBM Terpadu"] = schoolConfigs.PKBM;
schoolConfigs.PKBM = schoolConfigs["PKBM Terpadu"];

export const createInitialFormData = (config) => {
  const baseData = {
    noUrut: "",
    noUrutSekolah: "",
    kecamatan: "",

    // ✅ tambahan fondasi lokasi & kontak (biar konsisten dengan form terbaru)
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

    prasarana: {
      ukuran: { tanah: "", bangunan: "", halaman: "" },
      gedung: { jumlah: "" },
      ruangKelas: {
        jumlah: "",
        baik: "",
        rusakRingan: "",
        rusakSedang: "",
        rusakBerat: "",
        rusakTotal: "",
        kelebihan: "",
        kurangRkb: "",
        rkbTambahan: "",
        lahan: "Ada",
      },
      ruangPerpustakaan: {
        jumlah: "",
        baik: "",
        rusakSedang: "",
        rusakBerat: "",
      },
      ruangLaboratorium: {
        jumlah: "",
        baik: "",
        rusakSedang: "",
        rusakBerat: "",
      },
      ruangGuru: { jumlah: "", baik: "", rusakSedang: "", rusakBerat: "" },
      ruangUks: { jumlah: "", baik: "", rusakSedang: "", rusakBerat: "" },
      toiletGuruSiswa: {
        jumlah: "",
        baik: "",
        rusakSedang: "",
        rusakBerat: "",
      },
      rumahDinas: { jumlah: "", baik: "", rusakSedang: "", rusakBerat: "" },
      mebeulair: {
        meja: { jumlah: "", baik: "", rusak: "" },
        kursi: { jumlah: "", baik: "", rusak: "" },
      },
      chromebook: "",
    },

    kelembagaan: {
      peralatanRumahTangga: "Baik",
      pembinaan: "Belum",
      asesmen: "Belum",
      bop: { pengelola: "", tenagaPeningkatan: "" },
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
    // ✅ pastikan struktur paket konsisten: paketA/paketB/paketC
    baseData.siswa.paketA = {};
    baseData.siswa.paketB = {};
    baseData.siswa.paketC = {};

    baseData.siswaAbk.paketA = {};
    baseData.siswaAbk.paketB = {};
    baseData.siswaAbk.paketC = {};

    baseData.rombel.paketA = {};
    baseData.rombel.paketB = {};
    baseData.rombel.paketC = {};

    baseData.lulusanPaketB = {};
    baseData.lulusanPaketC = {};

    Object.entries(config.pakets || {}).forEach(([paketKey, paket]) => {
      const paketName = `paket${paketKey}`; // ✅ FIX: A -> paketA, dst

      (paket.grades || []).forEach((grade) => {
        baseData.siswa[paketName][`kelas${grade}`] = { l: "", p: "" };
        baseData.siswaAbk[paketName][`kelas${grade}`] = { l: "", p: "" };
        baseData.rombel[paketName][`kelas${grade}`] = "";
      });
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
