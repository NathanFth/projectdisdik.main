// src/app/components/ExcelImportButton.jsx
"use client";

import { useState, useRef } from "react";
import { FileSpreadsheet, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateTemplate, parseExcelFile } from "@/lib/utils/excelHelper";

export default function ExcelImportButton({
  schoolType,
  currentFormData, // Data form saat ini (Nested JSON)
  onImportSuccess, // Fungsi update state parent
}) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Download Template (Single School context)
  const handleDownload = async () => {
    try {
      setIsLoading(true);
      // Kita bungkus data form saat ini agar struktur cocok dengan helper generateTemplate
      // Helper mengharapkan array objek sekolah dengan properti 'meta'.
      const singleDataForExport = [
        {
          npsn: currentFormData.npsn,
          nama_sekolah: currentFormData.namaSekolah,
          kecamatan: currentFormData.kecamatan,
          desa: currentFormData.desa,
          alamat: currentFormData.alamat,
          status: currentFormData.status,
          lat: currentFormData.latitude,
          lng: currentFormData.longitude,
          meta: currentFormData, // Form data kita sudah dalam bentuk Nested JSON (meta)
        },
      ];

      await generateTemplate(schoolType, singleDataForExport);
      toast.success("Template berhasil didownload!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat template.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Upload & Parse
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const toastId = toast.loading("Membaca file Excel...");

    try {
      // Parse file menggunakan helper baru (return Array of Nested Objects)
      const parsedDataArray = await parseExcelFile(file);

      if (!parsedDataArray || parsedDataArray.length === 0) {
        throw new Error("File Excel kosong atau tidak terbaca.");
      }

      // Karena ini tombol import untuk "Single Form", kita ambil baris pertama saja
      // Atau kita cari baris yang NPSN-nya cocok jika ada (opsional)
      const newData = parsedDataArray[0];

      // Validasi sederhana (opsional)
      if (
        currentFormData.npsn &&
        newData.npsn &&
        String(currentFormData.npsn) !== String(newData.npsn)
      ) {
        const confirm = window.confirm(
          `NPSN di Excel (${newData.npsn}) berbeda dengan di Form (${currentFormData.npsn}). Tetap timpa?`
        );
        if (!confirm) {
          toast.dismiss(toastId);
          setIsLoading(false);
          return;
        }
      }

      // Kirim data matang ke Parent (Form Utama)
      onImportSuccess(newData);

      toast.success("Data Excel berhasil dimuat ke form!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Gagal mengimpor file.", { id: toastId });
    } finally {
      setIsLoading(false);
      // Reset input biar bisa pilih file yang sama lagi
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-full text-green-700">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-green-900">
            Import Data via Excel
          </h3>
          <p className="text-xs text-green-700">
            Isi data lebih cepat dengan mengunggah template Excel.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Template
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Memproses..." : "Upload Excel"}
        </button>

        {/* Hidden Input File */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          className="hidden"
        />
      </div>
    </div>
  );
}
