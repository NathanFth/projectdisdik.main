// src/lib/utils/excelHelper.js
import * as XLSX from "xlsx";

/**
 * 1. MAPPING GENERATOR
 * Fungsi ini membuat "Kamus" yang menghubungkan Judul Kolom Excel <-> Path Data di State.
 * Contoh: "Guru PNS" <-> "guru.pns"
 */
const getFieldMapping = (config, schoolType) => {
  const map = new Map();

  // --- A. IDENTITAS UTAMA ---
  map.set("NPSN", "npsn");
  map.set("Nama Sekolah", "namaSekolah");
  // Alamat & Wilayah
  map.set("Kecamatan", "kecamatan"); // Hanya teks, codingan nanti cari kodenya sendiri/manual
  map.set("Desa", "desa");
  map.set("Alamat", "alamat");
  map.set("Koordinat Lat", "latitude");
  map.set("Koordinat Long", "longitude");

  // --- B. DATA GURU ---
  map.set("Guru PNS", "guru.pns");
  map.set("Guru PPPK", "guru.pppk");
  map.set("Guru PPPK Paruh Waktu", "guru.pppkParuhWaktu");
  map.set("Guru Non ASN (Dapodik)", "guru.nonAsnDapodik");
  map.set("Guru Non ASN (Tidak Dapodik)", "guru.nonAsnTidakDapodik");
  map.set("Kekurangan Guru", "guru.kekuranganGuru");

  // --- C. SISWA, ABK & ROMBEL (DINAMIS SESUAI CONFIG) ---
  const addSiswaRombelMap = (prefixLabel, prefixPath, suffixLabel = "") => {
    // Siswa Reguler
    map.set(`Siswa ${prefixLabel} L`, `siswa.${prefixPath}.l`);
    map.set(`Siswa ${prefixLabel} P`, `siswa.${prefixPath}.p`);
    // Siswa ABK
    map.set(`ABK ${prefixLabel} L`, `siswaAbk.${prefixPath}.l`);
    map.set(`ABK ${prefixLabel} P`, `siswaAbk.${prefixPath}.p`);
    // Rombel
    map.set(`Rombel ${prefixLabel}`, `rombel.${prefixPath}`);
  };

  if (config.isPkbm && config.pakets) {
    // Logic PKBM (Paket -> Kelas)
    Object.entries(config.pakets).forEach(([paketKey, paket]) => {
      const pName = `Paket ${paketKey}`;
      (paket.grades || []).forEach((grade) => {
        addSiswaRombelMap(
          `${pName} Kls ${grade}`,
          `paket${paketKey}.kelas${grade}`
        );
      });
    });
  } else if (config.isPaud && config.rombelTypes) {
    // Logic PAUD/TK
    config.rombelTypes.forEach((t) => {
      addSiswaRombelMap(t.label, t.key);
    });
  } else if (config.grades) {
    // Logic SD/SMP
    config.grades.forEach((grade) => {
      addSiswaRombelMap(`Kls ${grade}`, `kelas${grade}`);
    });
  }

  // --- D. PRASARANA (UMUM) ---
  // Ukuran
  map.set("Luas Tanah (m2)", "prasarana.ukuran.tanah");
  map.set("Luas Bangunan (m2)", "prasarana.ukuran.bangunan");
  map.set("Luas Halaman (m2)", "prasarana.ukuran.halaman");
  map.set("Jml Gedung", "prasarana.gedung.jumlah");

  // Ruang Kelas
  const classroomPath = "prasarana.classrooms";
  map.set("R. Kelas (Total)", `${classroomPath}.total_room`);
  map.set("R. Kelas (Baik)", `${classroomPath}.classrooms_good`);
  map.set("R. Kelas (R. Ringan)", `${classroomPath}.rusakRingan`);
  map.set(
    "R. Kelas (R. Sedang)",
    `${classroomPath}.classrooms_moderate_damage`
  );
  map.set("R. Kelas (R. Berat)", `${classroomPath}.heavy_damage`);
  map.set("R. Kelas (R. Total)", `${classroomPath}.rusakTotal`);
  map.set("Kekurangan RKB", `${classroomPath}.kurangRkb`);
  map.set("Kelebihan R. Kelas", `${classroomPath}.kelebihan`);
  map.set("Usul RKB Tambahan", `${classroomPath}.rkbTambahan`);
  map.set("Ketersediaan Lahan (Ada/Tidak)", `${classroomPath}.lahan`);

  // Ruangan Lainnya (Standard)
  const rooms = [
    { label: "Perpus", path: "library" },
    { label: "R. Guru", path: "teacher_room" },
    { label: "UKS", path: "uks_room" },
    { label: "Rumah Dinas", path: "official_residences" },
  ];

  // Logic Lab & Toilet (Beda SMP dan SD)
  const isSmp = schoolType === "SMP";

  if (!isSmp) {
    // SD / PKBM / PAUD pakai struktur sederhana
    rooms.push({ label: "Lab Umum", path: "laboratory" });
    rooms.push({ label: "Toilet", path: "toilets" });
  }

  rooms.forEach((r) => {
    map.set(`${r.label} (Total)`, `prasarana.rooms.${r.path}.total`);
    map.set(`${r.label} (Baik)`, `prasarana.rooms.${r.path}.good`);
    map.set(
      `${r.label} (R. Sedang)`,
      `prasarana.rooms.${r.path}.moderate_damage`
    );
    map.set(`${r.label} (R. Berat)`, `prasarana.rooms.${r.path}.heavy_damage`);
  });

  // --- E. PRASARANA KHUSUS SMP ---
  if (isSmp) {
    const labs = [
      { l: "Lab Komputer", k: "laboratory_comp" },
      { l: "Lab Bahasa", k: "laboratory_langua" },
      { l: "Lab IPA", k: "laboratory_ipa" },
      { l: "Lab Fisika", k: "laboratory_fisika" },
      { l: "Lab Biologi", k: "laboratory_biologi" },
    ];
    labs.forEach((lb) => {
      map.set(`${lb.l} (Total)`, `prasarana.labs.${lb.k}.total_all`);
      map.set(`${lb.l} (Baik)`, `prasarana.labs.${lb.k}.good`);
      map.set(`${lb.l} (R. Sedang)`, `prasarana.labs.${lb.k}.moderate_damage`);
      map.set(`${lb.l} (R. Berat)`, `prasarana.labs.${lb.k}.heavy_damage`);
    });

    const toilets = [
      { l: "Toilet Guru L", k: "teachers_toilet.male" },
      { l: "Toilet Guru P", k: "teachers_toilet.female" },
      { l: "Toilet Siswa L", k: "students_toilet.male" },
      { l: "Toilet Siswa P", k: "students_toilet.female" },
    ];
    toilets.forEach((t) => {
      map.set(`${t.l} (Total)`, `prasarana.${t.k}.total`);
      map.set(`${t.l} (Baik)`, `prasarana.${t.k}.good`);
      map.set(`${t.l} (R. Sedang)`, `prasarana.${t.k}.moderate_damage`);
      map.set(`${t.l} (R. Berat)`, `prasarana.${t.k}.heavy_damage`);
    });
  }

  // --- F. MEBEULAIR & LAINNYA ---
  ["Meja", "Kursi"].forEach((item) => {
    const key = item === "Meja" ? "tables" : "chairs";
    map.set(`${item} (Total)`, `prasarana.furniture.${key}.total`);
    map.set(`${item} (Baik)`, `prasarana.furniture.${key}.good`);
    map.set(
      `${item} (R. Sedang)`,
      `prasarana.furniture.${key}.moderate_damage`
    );
    map.set(`${item} (R. Berat)`, `prasarana.furniture.${key}.heavy_damage`);
  });

  map.set("Komputer (Unit)", "prasarana.furniture.computer");
  map.set("Chromebook (Unit)", "prasarana.chromebook");

  // --- G. KEGIATAN FISIK ---
  map.set("Rehab Ruang Kelas", "kegiatanFisik.rehabRuangKelas");
  map.set("Pembangunan RKB", "kegiatanFisik.pembangunanRKB");
  map.set("Rehab Toilet", "kegiatanFisik.rehabToilet");
  map.set("Pembangunan Toilet", "kegiatanFisik.pembangunanToilet");

  // --- H. KELEMBAGAAN (BARU DITAMBAHKAN) ---
  map.set("Alat Rumah Tangga", "kelembagaan.peralatanRumahTangga");
  map.set("Pembinaan", "kelembagaan.pembinaan");
  map.set("Asesmen", "kelembagaan.asesmen");
  map.set("Menyelenggarakan Belajar", "kelembagaan.menyelenggarakanBelajar");
  map.set("Melaksanakan Rekomendasi", "kelembagaan.melaksanakanRekomendasi");
  map.set("Siap Dievaluasi", "kelembagaan.siapDievaluasi");

  // BOP
  map.set("BOP Pengelola", "kelembagaan.bop.pengelola");
  map.set("BOP Tenaga Peningkatan", "kelembagaan.bop.tenagaPeningkatan");

  // Perizinan
  map.set("Izin Pengendalian", "kelembagaan.perizinan.pengendalian");
  map.set("Izin Kelayakan", "kelembagaan.perizinan.kelayakan");

  // Kurikulum
  map.set("Kurikulum Silabus", "kelembagaan.kurikulum.silabus");
  map.set(
    "Kurikulum Kompetensi Dasar",
    "kelembagaan.kurikulum.kompetensiDasar"
  );

  return map;
};

/**
 * 2. GENERATE TEMPLATE
 * Membuat file Excel kosong dengan header yang sesuai
 */
export const generateTemplate = (config, schoolType) => {
  const mapping = getFieldMapping(config, schoolType);
  const headers = Array.from(mapping.keys());

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wscols = headers.map(() => ({ wch: 20 }));
  ws["!cols"] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Data");

  XLSX.writeFile(
    wb,
    `Template_Input_${schoolType}_${new Date().getTime()}.xlsx`
  );
};

/**
 * 3. PROCESS IMPORT
 * Membaca file Excel -> Mengubah jadi FormData Object
 */
export const processExcelImport = async (
  file,
  config,
  schoolType,
  currentFormData,
  isEditMode = false
) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          throw new Error("File Excel kosong!");
        }

        const row = jsonData[0];

        // Validasi NPSN
        const importedNpsn = String(row["NPSN"] || "").trim();
        const currentNpsn = String(currentFormData.npsn || "").trim();

        if (isEditMode) {
          if (!importedNpsn) {
            // Warning optional
          } else if (importedNpsn !== currentNpsn) {
            reject(
              new Error(
                `NPSN tidak cocok! Form: ${currentNpsn}, Excel: ${importedNpsn}. Mohon cek file anda.`
              )
            );
            return;
          }
        }

        const mapping = getFieldMapping(config, schoolType);
        let newFormData = JSON.parse(JSON.stringify(currentFormData));

        mapping.forEach((path, header) => {
          let value = row[header];

          if (value === undefined || value === "") return;

          const isNumericField = ![
            "npsn",
            "namaSekolah",
            "alamat",
            "kecamatan",
            "desa",
            "lahan",
            // Field Kelembagaan biasanya string/enum, kita anggap non-numeric biar aman
            // tapi kalau user isi "1" untuk "Ya", logic di bawah mungkin convert jadi number.
            // Kita tambah filter biar path kelembagaan dianggap string.
            "kelembagaan",
          ].some((k) => path.includes(k));

          if (isNumericField && !isNaN(Number(value))) {
            value = Number(value);
          } else {
            value = String(value);
          }

          const keys = path.split(".");
          let current = newFormData;

          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
        });

        resolve(newFormData);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(new Error("Gagal membaca file Excel"));
    reader.readAsArrayBuffer(file);
  });
};
