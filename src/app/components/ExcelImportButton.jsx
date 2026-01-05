// src/app/components/ExcelImportButton.jsx
"use client";

import { useState, useRef } from "react";
import { FileSpreadsheet, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateTemplate, processExcelImport } from "@/lib/utils/excelHelper";

export default function ExcelImportButton({
  config,
  schoolType,
  currentFormData,
  onImportSuccess, // Ini nanti diisi handleBulkUpdate dari parent
  isEditMode = false,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownload = () => {
    try {
      generateTemplate(config, schoolType);
      toast.success("Template berhasil didownload!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat template.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const toastId = toast.loading("Membaca file Excel...");

    try {
      // Panggil otak parser kita
      const newFormData = await processExcelImport(
        file,
        config,
        schoolType,
        currentFormData,
        isEditMode
      );

      // Kirim data matang ke Parent (Form Utama)
      onImportSuccess(newFormData);

      toast.success("Data Excel berhasil dimuat ke form!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Gagal mengimpor file.", { id: toastId });
    } finally {
      setIsLoading(false);
      // Reset input biar bisa pilih file yang sama lagi kalau mau
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
          <Download className="w-4 h-4 mr-2" />
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
