// src/lib/utils/excelHelper.js
import * as XLSX from "xlsx";
import { createInitialFormData } from "@/lib/config/createInitialFormData";
import { schoolConfigs } from "@/lib/config/schoolConfig";

// --- HELPER: FLATTEN ---
const flattenObject = (obj, prefix = "") => {
  if (!obj || typeof obj !== "object") return {};

  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + "." : "";
    if (
      typeof obj[k] === "object" &&
      obj[k] !== null &&
      !Array.isArray(obj[k])
    ) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

// --- HELPER: UNFLATTEN ---
const unflattenObject = (data) => {
  const result = {};
  for (const i in data) {
    const keys = i.split(".");
    keys.reduce((acc, key, index) => {
      if (index === keys.length - 1) {
        let val = data[i];
        const isCode =
          i.includes("npsn") ||
          i.includes("hp") ||
          i.includes("code") ||
          i.includes("desa") ||
          i.includes("kecamatan") ||
          i.includes("alamat");

        if (!isCode && !isNaN(Number(val)) && val !== "") {
          acc[key] = Number(val);
        } else {
          acc[key] = val;
        }
      } else {
        acc[key] = acc[key] || {};
      }
      return acc[key];
    }, result);
  }
  return result;
};

// --- 1. GENERATE TEMPLATE (EXPORT) ---
export const generateTemplate = async (
  schoolType,
  existingData = [],
  onProgress,
) => {
  // 1. Ambil Struktur Dasar Lengkap
  const config = schoolConfigs[schoolType] || schoolConfigs.default;
  const baseStructure = createInitialFormData(config);
  const flatBaseStructure = flattenObject(baseStructure);

  // 2. DEFINISI KOLOM YANG HARUS DIHAPUS (STATIC BLACKLIST)
  const fieldsToRemove = [
    "noUrut",
    "noUrutSekolah",
    "namaOperator",
    "hp",
    "monthly_report_file",
    "kecamatan_code",
    "desa_code",
    "bantuan_received",
  ];

  // 3. DEFINISI URUTAN HEADER (PRIORITAS)
  const priorityHeaders = [
    "namaSekolah",
    "npsn",
    "kecamatan",
    "desa",
    "alamat",
    "status",
  ];

  // =====================================================================
  // ✅ FITUR BARU: DYNAMIC FILTER (Sesuaikan Kolom dengan UI Prasarana)
  // =====================================================================
  const isSmp = schoolType === "SMP";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";

  const isRelevantField = (key) => {
    // A. Cek Blacklist Statis
    if (fieldsToRemove.includes(key)) return false;

    // B. Cek Kondisi Prasarana (Sesuai UI InfrastructureSection.jsx)

    // 1. PAUD/TK
    // - Tidak butuh Lab apapun (General/Spesifik)
    // - Tidak butuh Toilet Detail (Guru L/P, Siswa L/P) -> Pakai Toilet Umum
    // - Butuh APE
    if (isPaud) {
      if (key.includes("prasarana.labs")) return false; // Hide all labs
      if (key.includes("prasarana.rooms.laboratory")) return false; // Hide general lab
      if (key.includes("prasarana.teachers_toilet")) return false; // Hide detailed toilet
      if (key.includes("prasarana.students_toilet")) return false; // Hide detailed toilet
      // Keep: prasarana.rooms.ape & prasarana.rooms.toilets (general)
    }

    // 2. SMP
    // - Tidak butuh APE
    // - Tidak butuh Toilet Umum (karena sudah rinci)
    // - Tidak butuh Lab Umum (karena sudah rinci: IPA, Fisika, dll)
    else if (isSmp) {
      if (key.includes("prasarana.rooms.ape")) return false;
      if (key.includes("prasarana.rooms.toilets")) return false; // Hide general toilet
      if (key.includes("prasarana.rooms.laboratory")) return false; // Hide general lab
      // Keep: prasarana.labs.*, teachers_toilet.*, students_toilet.*
    }

    // 3. SD / PKBM / Lainnya
    // - Tidak butuh APE
    // - Tidak butuh Toilet Detail -> Pakai Toilet Umum
    // - Tidak butuh Lab Spesifik (IPA/Fisika) -> Pakai Lab Umum
    else {
      if (key.includes("prasarana.rooms.ape")) return false;
      if (key.includes("prasarana.teachers_toilet")) return false;
      if (key.includes("prasarana.students_toilet")) return false;
      if (key.includes("prasarana.labs")) return false; // Hide specific labs
      // Keep: prasarana.rooms.laboratory (general) & prasarana.rooms.toilets (general)
    }

    return true;
  };
  // =====================================================================

  // 4. FILTER FINAL HEADER
  const allBaseKeys = Object.keys(flatBaseStructure);

  // Gunakan fungsi isRelevantField untuk filter
  const validHeaders = allBaseKeys.filter((key) => isRelevantField(key));

  const otherHeaders = validHeaders.filter(
    (key) => !priorityHeaders.includes(key),
  );

  const finalHeaderOrder = [...priorityHeaders, ...otherHeaders];

  // --- FUNGSI SANITASI DATA ---
  const sanitizeRow = (rawData) => {
    const cleanData = {};
    finalHeaderOrder.forEach((header) => {
      cleanData[header] =
        rawData[header] !== undefined && rawData[header] !== null
          ? rawData[header]
          : "";
    });
    return cleanData;
  };

  let dataToExport = [];

  if (existingData && existingData.length > 0) {
    dataToExport = existingData.map((school) => {
      const flatMeta = school.meta ? flattenObject(school.meta) : {};
      const rawRow = { ...flatBaseStructure, ...flatMeta };

      rawRow.namaSekolah = school.nama_sekolah;
      rawRow.npsn = school.npsn;
      rawRow.kecamatan = school.kecamatan;
      rawRow.desa = school.desa;
      rawRow.alamat = school.alamat;
      rawRow.status = school.status;
      rawRow.latitude = school.lat || "";
      rawRow.longitude = school.lng || "";

      return sanitizeRow(rawRow);
    });

    // AUTO SORTING: Kecamatan (A-Z) -> Sekolah (A-Z)
    dataToExport.sort((a, b) => {
      const kecA = (a.kecamatan || "").toString().toLowerCase();
      const kecB = (b.kecamatan || "").toString().toLowerCase();
      if (kecA < kecB) return -1;
      if (kecA > kecB) return 1;

      const nameA = (a.namaSekolah || "").toString().toLowerCase();
      const nameB = (b.namaSekolah || "").toString().toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      return 0;
    });
  } else {
    const rawBase = { ...flatBaseStructure };
    dataToExport = [sanitizeRow(rawBase)];
  }

  // 5. Generate Worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataToExport, {
    header: finalHeaderOrder,
    skipHeader: false,
  });

  const wscols = finalHeaderOrder.map((h) => ({
    wch: Math.max(h.length + 5, 15),
  }));
  worksheet["!cols"] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Data ${schoolType}`);

  // 6. Download
  XLSX.writeFile(
    workbook,
    `Template_Input_${schoolType}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

// --- 2. PARSE IMPORT ---
export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonFlat = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonFlat.length === 0) throw new Error("File Excel kosong!");

        const jsonNested = jsonFlat.map((row) => unflattenObject(row));
        resolve(jsonNested);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(new Error("Gagal membaca file Excel"));
    reader.readAsArrayBuffer(file);
  });
};
