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
  },
  SMP: {
    schoolTypeId: 4,
    grades: [7, 8, 9],
    lanjutDalamKabOptions: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
    lanjutLuarKabOptions: [
      { key: "sma", label: "SMA" },
      { key: "smk", label: "SMK" },
      { key: "ma", label: "MA" },
      { key: "pontren", label: "Pontren" },
      { key: "pkbm", label: "PKBM" },
    ],
  },
  "TK/PAUD": {
    schoolTypeId: 1,
    isPaud: true,
    rombelTypes: [
      { key: "tka", label: "TK A" },
      { key: "tkb", label: "TK B" },
      { key: "kb", label: "Kelompok Bermain (KB)" },
      { key: "sps_tpa", label: "SPS / TPA" },
    ],
    lanjutDalamKabOptions: [
      { key: "sd", label: "SD" },
      { key: "mi", label: "MI" },
    ],
    lanjutLuarKabOptions: [
      { key: "sd", label: "SD" },
      { key: "mi", label: "MI" },
    ],
  },
  "PKBM Terpadu": {
    schoolTypeId: 2,
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
    ],
  },
  default: { grades: [], lanjutDalamKabOptions: [], lanjutLuarKabOptions: [] },
};

schoolConfigs.TK = schoolConfigs["TK/PAUD"];
schoolConfigs.PAUD = schoolConfigs["TK/PAUD"];
schoolConfigs.PKBM = schoolConfigs["PKBM Terpadu"];

export const createInitialFormData = (config) => {
  const baseData = {
    noUrut: "",
    noUrutSekolah: "",
    kecamatan: "",
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
      jumlahGuru: "",
      pns: "",
      pppk: "",
      pppkParuhWaktu: "",
      nonAsnDapodik: "",
      nonAsnTidakDapodik: "",
      kekuranganGuru: "",
    },
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
    baseData.lulusanPaketB = {};
    baseData.lulusanPaketC = {};

    Object.entries(config.pakets).forEach(([k, paket]) => {
      const key = `paket${k}`;
      paket.grades.forEach((grade) => {
        baseData.siswa[key][`kelas${grade}`] = { l: "", p: "" };
        baseData.siswaAbk[key][`kelas${grade}`] = { l: "", p: "" };
        baseData.rombel[key][`kelas${grade}`] = "";
      });
    });
  } else if (config.isPaud) {
    baseData.siswaLanjutDalamKab = {};
    baseData.siswaLanjutLuarKab = {};
    baseData.siswaTidakLanjut = "";

    config.rombelTypes.forEach((t) => {
      baseData.siswa[t.key] = { l: "", p: "" };
      baseData.siswaAbk[t.key] = { l: "", p: "" };
      baseData.rombel[t.key] = "";
    });
  } else if (config.grades) {
    baseData.status = "Negeri";
    baseData.siswaLanjutDalamKab = {};
    baseData.siswaLanjutLuarKab = {};
    baseData.siswaTidakLanjut = "";
    baseData.siswaBekerja = "";

    config.grades.forEach((g) => {
      baseData.siswa[`kelas${g}`] = { l: "", p: "" };
      baseData.siswaAbk[`kelas${g}`] = { l: "", p: "" };
      baseData.rombel[`kelas${g}`] = "";
    });
  }

  return baseData;
};
// export const GARUT_KECAMATAN_OPTIONS = [
//   "Banjarwangi",
//   "Banyuresmi",
//   "Bayongbong",
//   "Blubur Limbangan",
//   "Cibatu",
//   "Cibiuk",
//   "Cigedug",
//   "Cihurip",
//   "Cikajang",
//   "Cikelet",
//   "Cilawu",
//   "Cisewu",
//   "Cisompet",
//   "Cisurupan",
//   "Garut Kota",
//   "Kadungora",
//   "Karangpawitan",
//   "Karangtengah",
//   "Kersamanah",
//   "Leles",
//   "Leuwigoong",
//   "Malangbong",
//   "Mekarmukti",
//   "Pakenjeng",
//   "Pameungpeuk",
//   "Pamulihan",
//   "Pangatikan",
//   "Pasirwangi",
//   "Peundeuy",
//   "Samarang",
//   "Selaawi",
//   "Singajaya",
//   "Sucinaraja",
//   "Sukaresmi",
//   "Sukawening",
//   "Talegong",
//   "Tarogong Kaler",
//   "Tarogong Kidul",
//   "Wanaraja",
//   "Caringin",
//   "Pakenjeng",
//   "Peundeuy",
// ].map((nama) => ({ value: nama, label: nama }));
