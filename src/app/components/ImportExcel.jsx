// src/app/components/ImportExcel.jsx
"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { generateTemplate, parseExcelFile } from "@/lib/utils/excelHelper";
import { dataInputService } from "@/services/dataInputService";
import { toast } from "sonner";

export default function ImportExcel({ schoolType = "SD" }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState(null);
  const [error, setError] = useState(null);

  // 1. Handle Download Template
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      setError(null);

      // Ambil data sekolah terbaru dari DB
      const schools =
        await dataInputService.getAllSchoolsForTemplate(schoolType);

      // Generate Excel (Flattening)
      await generateTemplate(schoolType, schools);

      toast.success("Template berhasil diunduh.");
    } catch (err) {
      console.error(err);
      setError(
        "Gagal mendownload template: " + (err?.message || "Unknown error"),
      );
      toast.error("Gagal mengunduh template.");
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Handle Upload & Process
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmMsg =
      "PERINGATAN: Proses ini akan MENIMPA data di database dengan data yang ada di Excel. Pastikan Anda sudah menggunakan Template terbaru. Lanjutkan?";
    if (!window.confirm(confirmMsg)) {
      e.target.value = "";
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setUploadStats(null);
      setError(null);

      // A. Parse Excel (Unflattening)
      const parsedData = await parseExcelFile(file);

      if (!parsedData || parsedData.length === 0) {
        throw new Error("File Excel kosong atau format salah.");
      }

      // B. Batch Update ke Server (1x RPC Call)
      // Progress: fase build payload (client-side) dibatasi sampai 70%
      const result = await dataInputService.batchUpdateSchools(
        schoolType,
        parsedData,
        (current, total) => {
          const pct = Math.round((current / total) * 70);
          setProgress(pct);
        },
      );

      // Setelah RPC selesai
      setProgress(100);
      setUploadStats(result);

      toast.success(
        `Selesai. Berhasil: ${result.successCount}, Gagal: ${result.failCount}.`,
      );

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        toast.error(
          `Terdapat ${result.errors.length} error. Lihat detail di bawah.`,
        );
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memproses file: " + (err?.message || "Unknown error"));
      toast.error("Gagal memproses file.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Import / Export Data Massal ({schoolType})
          </h2>
          <p className="text-sm text-muted-foreground">
            Unduh template berisi data sekolah terkini, edit di Excel, lalu
            unggah kembali untuk memperbarui data secara massal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* KIRI: Download */}
          <div className="space-y-4 border-r md:pr-8 border-gray-100">
            <h3 className="font-medium text-sm text-gray-700">
              Langkah 1: Unduh Template
            </h3>
            <p className="text-xs text-gray-500">
              File Excel akan berisi daftar semua sekolah {schoolType} di
              database beserta data terakhirnya. Gunakan file ini sebagai dasar
              pengeditan.
            </p>
            <Button
              onClick={handleDownloadTemplate}
              disabled={isDownloading || isProcessing}
              variant="outline"
              className="w-full justify-start gap-2 h-12"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? "Sedang Mengunduh..." : "Download Template Data"}
            </Button>
          </div>

          {/* KANAN: Upload */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">
              Langkah 2: Upload Data
            </h3>
            <p className="text-xs text-gray-500">
              Unggah file Excel yang sudah diedit. <br />
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Button
                disabled={isProcessing}
                className="w-full justify-start gap-2 h-12 bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isProcessing
                  ? `Memproses... ${progress}%`
                  : "Pilih File Excel & Upload"}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                Memproses data ke server... (Jangan tutup halaman ini)
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success / Stats Message */}
        {uploadStats && !isProcessing && (
          <div className="mt-6 space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Proses Selesai</AlertTitle>
              <AlertDescription className="text-green-700">
                Data berhasil diproses.
                <ul className="list-disc list-inside mt-2 text-xs">
                  <li>
                    Berhasil: <b>{uploadStats.successCount}</b> sekolah
                  </li>
                  <li>
                    Gagal: <b>{uploadStats.failCount}</b> sekolah
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {Array.isArray(uploadStats.errors) &&
              uploadStats.errors.length > 0 && (
                <div className="rounded-lg border bg-gray-50 p-4 max-h-60 overflow-y-auto text-xs font-mono">
                  <p className="font-bold text-gray-700 mb-2">Detail Error:</p>
                  {uploadStats.errors.map((errMsg, idx) => (
                    <div
                      key={idx}
                      className="text-red-600 mb-1 border-b border-gray-200 pb-1 last:border-0"
                    >
                      {errMsg}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
