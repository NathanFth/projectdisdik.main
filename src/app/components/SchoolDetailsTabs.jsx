// src/app/components/SchoolDetailsTabs.jsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  School,
  MapPin,
  Users,
  Building,
  Calendar,
  UserCheck,
  ClipboardList,
  UserPlus,
  TrendingUp,
  Armchair,
  Laptop,
  Layers,
  FlaskConical,
  Computer,
  Languages,
  Library,
  Briefcase,
  PersonStanding,
  HeartPulse,
  Bath,
  FileX2,
  Home,
  MessageCircle,
  Construction,
  Monitor,
  Accessibility,
} from "lucide-react";

// Load Map secara lazy
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground">
      Memuat Peta...
    </div>
  ),
});

const toNum = (v) => Number(v) || 0;

export default function SchoolDetailsTabs({ school }) {
  const [activeTab, setActiveTab] = useState("basic");

  if (!school)
    return (
      <div className="p-6 text-muted-foreground">Data tidak tersedia.</div>
    );

  const {
    schoolType,
    prasarana = {},
    kegiatanFisik = {},
    kelembagaan = {},
    guru = {},
    siswa = {},
    rombel = {},
    siswaAbk = {}, // ✅ Data ABK
    lulusan = {},
  } = school;

  const isSmp = schoolType === "SMP";
  const isPkbm = schoolType === "PKBM" || schoolType === "PKBM TERPADU";
  const isPaud = schoolType === "PAUD" || schoolType === "TK";
  const isSd = schoolType === "SD";

  const getStatusColor = (s) =>
    s === "Aktif"
      ? "bg-green-100 text-green-700 hover:bg-green-200"
      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";

  // --- HELPER CRITICAL: AKSES DATA PRASARANA ---
  const getRoomData = (key) => {
    if (prasarana.rooms && prasarana.rooms[key]) return prasarana.rooms[key];
    if (prasarana[key]) return prasarana[key];

    const legacyMap = {
      kepsek_room: "ruangKepsek",
      teacher_room: "ruangGuru",
      administration_room: "ruangTu",
      uks_room: "ruangUks",
      bk_room: "ruangBk",
      worship_place: "tempatIbadah",
      official_residences: "rumahDinas",
      toilets: "toiletGuruSiswa",
    };

    if (legacyMap[key] && prasarana[legacyMap[key]]) {
      return prasarana[legacyMap[key]];
    }
    return null;
  };

  const getLabData = (key) => {
    if (prasarana.labs && prasarana.labs[key]) return prasarana.labs[key];
    if (prasarana[key]) return prasarana[key];
    return null;
  };

  // --- 1. INFO DASAR ---
  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {school.namaSekolah}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
              <Badge variant="outline" className="font-mono bg-gray-50">
                {school.npsn}
              </Badge>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {school.kecamatan}
              </span>
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {school.status}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(school.dataStatus)}>
              {school.dataStatus}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Update: {school.lastUpdated}
            </span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Alamat Lengkap
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {school.alamat || "Alamat belum diisi lengkap."}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-700">
                  {school.student_count}
                </div>
                <div className="text-xs text-blue-600">Total Siswa</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-700">
                  {guru.jumlahGuru}
                </div>
                <div className="text-xs text-green-600">Total Guru</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center border border-orange-100">
                <Accessibility className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-orange-600">
                  {/* Hitung total ABK */}
                  {(() => {
                    let total = 0;
                    const count = (obj) => {
                      if (!obj) return;
                      Object.values(obj).forEach((v) => {
                        if (v && typeof v === "object") {
                          if (v.l === undefined) count(v);
                          else total += toNum(v.l) + toNum(v.p);
                        }
                      });
                    };
                    count(siswaAbk);
                    return total;
                  })()}
                </div>
                <div className="text-xs text-orange-600">Total ABK</div>
              </div>
            </div>
          </div>
          <div className="h-48 rounded-lg overflow-hidden border relative z-0">
            <LocationPickerMap
              initialCoordinates={
                school.latitude && school.longitude
                  ? [school.latitude, school.longitude]
                  : null
              }
              readOnly={true}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // --- 2. SISWA & ABK ---
  const renderStudentsInfo = () => {
    // ✅ Updated: Logic HIDE kolom Rombel jika isAbk=true
    const renderRow = (label, dataSiswa, dataRombel, isAbk = false) => {
      const l = toNum(dataSiswa?.l);
      const p = toNum(dataSiswa?.p);
      const rombelVal = toNum(dataRombel);
      return (
        <tr key={label} className="border-b last:border-0 hover:bg-gray-50/50">
          <td className="px-4 py-3 text-sm font-medium text-gray-700">
            {label}
          </td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{l}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{p}</td>
          <td className="px-4 py-3 text-sm text-center font-bold text-gray-800">
            {l + p}
          </td>
          {/* Sembunyikan kolom rombel untuk ABK */}
          {!isAbk && (
            <td className="px-4 py-3 text-sm text-center text-gray-600">
              {rombelVal}
            </td>
          )}
        </tr>
      );
    };

    const TableHeader = ({ isAbk }) => (
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
            Kelas
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
            Laki-laki
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
            Perempuan
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
            Total
          </th>
          {!isAbk && (
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
              Rombel
            </th>
          )}
        </tr>
      </thead>
    );

    const generateTableContent = (dataSource, rombelSource, isAbk = false) => {
      if (isPkbm) {
        return Object.entries({
          A: [1, 2, 3, 4, 5, 6],
          B: [7, 8, 9],
          C: [10, 11, 12],
        }).map(([paket, grades]) => (
          <div key={paket} className="mb-4 last:mb-0">
            <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
              Paket {paket}
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <TableHeader isAbk={isAbk} />
                <tbody>
                  {grades.map((g) =>
                    renderRow(
                      `Kelas ${g}`,
                      dataSource[`paket${paket}`]?.[`kelas${g}`],
                      rombelSource[`paket${paket}`]?.[`kelas${g}`],
                      isAbk
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ));
      } else if (isPaud) {
        const types = [
          { k: "tka", l: "TK A" },
          { k: "tkb", l: "TK B" },
          { k: "kb", l: "Kelompok Bermain" },
          { k: "sps_tpa", l: "SPS / TPA" },
        ];
        return (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <TableHeader isAbk={isAbk} />
              <tbody>
                {types.map((t) =>
                  renderRow(t.l, dataSource[t.k], rombelSource[t.k], isAbk)
                )}
              </tbody>
            </table>
          </div>
        );
      } else {
        const grades = isSd ? [1, 2, 3, 4, 5, 6] : [7, 8, 9];
        return (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <TableHeader isAbk={isAbk} />
              <tbody>
                {grades.map((g) =>
                  renderRow(
                    `Kelas ${g}`,
                    dataSource[`kelas${g}`],
                    rombelSource[`kelas${g}`],
                    isAbk
                  )
                )}
              </tbody>
            </table>
          </div>
        );
      }
    };

    return (
      <div className="space-y-8">
        {/* TABEL SISWA REGULER */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Peserta Didik Reguler
            </h3>
          </div>
          {generateTableContent(siswa, rombel, false)}
        </div>

        {/* TABEL SISWA ABK */}
        <div>
          <div className="flex items-center gap-2 mb-4 pt-4 border-t">
            <Accessibility className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Peserta Didik Berkebutuhan Khusus (ABK)
            </h3>
          </div>
          {generateTableContent(siswaAbk, {}, true)}
        </div>
      </div>
    );
  };

  // --- 3. GURU ---
  const renderTeachersInfo = () => {
    const items = [
      { l: "Total Guru", v: guru.jumlahGuru },
      { l: "PNS", v: guru.pns },
      { l: "PPPK", v: guru.pppk },
      { l: "PPPK Paruh Waktu", v: guru.pppkParuhWaktu },
      { l: "Non ASN (Dapodik)", v: guru.nonAsnDapodik },
      { l: "Non ASN (Lainnya)", v: guru.nonAsnTidakDapodik },
      {
        l: "Kekurangan Guru",
        v: guru.kekuranganGuru,
        hl: true,
        color: "text-red-600",
        bg: "bg-red-50",
      },
    ];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-bold text-gray-900">Kepegawaian</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((i) => (
            <div
              key={i.l}
              className={`border rounded-lg p-4 text-center ${
                i.bg || "bg-white"
              }`}
            >
              <div
                className={`text-2xl font-bold ${i.color || "text-gray-800"}`}
              >
                {i.v}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                {i.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- 4. LULUSAN ---
  const renderGraduationInfo = () => {
    const CardStat = ({ label, val }) => (
      <div className="bg-gray-50 border p-4 rounded-lg flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-xl font-bold text-gray-900">{toNum(val)}</span>
      </div>
    );
    if (isPkbm)
      return (
        <div className="space-y-6">
          {["A", "B", "C"].map((p) => (
            <div key={p}>
              <h4 className="font-bold text-gray-800 mb-3">
                Lulusan Paket {p}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(lulusan[`paket${p}`] || {}).map(([k, v]) => (
                  <CardStat key={k} label={k.toUpperCase()} val={v} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    const dalamKab = lulusan.dalamKab || {};
    const luarKab = lulusan.luarKab || {};
    return (
      <div className="space-y-8">
        <div>
          <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">
            Melanjutkan Dalam Kabupaten
          </h4>
          {Object.keys(dalamKab).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(dalamKab).map(([k, v]) => (
                <CardStat key={k} label={k.toUpperCase()} val={v} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Tidak ada data.</p>
          )}
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">
            Melanjutkan Luar Kabupaten
          </h4>
          {Object.keys(luarKab).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(luarKab).map(([k, v]) => (
                <CardStat key={k} label={k.toUpperCase()} val={v} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Tidak ada data.</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium text-red-700">
              Tidak Melanjutkan
            </span>
            <span className="text-2xl font-bold text-red-700">
              {toNum(lulusan.tidakLanjut)}
            </span>
          </div>
          <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium text-green-700">Bekerja</span>
            <span className="text-2xl font-bold text-green-700">
              {toNum(lulusan.bekerja)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // --- 5. PRASARANA ---
  const renderFacilitiesInfo = () => {
    const DetailedRoomItem = ({
      label,
      data,
      icon: Icon,
      color = "text-gray-500",
    }) => {
      if (!data && data !== 0) return null;

      const total =
        typeof data === "object"
          ? data.total || data.jumlah || data.total_all || data.total_room || 0
          : data;

      const isObj = typeof data === "object";
      const baik = isObj ? toNum(data.good) || toNum(data.baik) : 0;
      const sedang = isObj
        ? toNum(data.moderate_damage) ||
          toNum(data.rusakSedang) ||
          toNum(data.rusak_sedang)
        : 0;
      const berat = isObj
        ? toNum(data.heavy_damage) ||
          toNum(data.rusakBerat) ||
          toNum(data.rusak_berat)
        : 0;

      return (
        <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b">
            <div className="p-2 bg-gray-50 rounded-md">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="text-sm font-bold text-gray-900">{label}</div>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-bold text-gray-800">{total}</div>
            </div>
            <div>
              <div className="text-xs text-green-600">Baik</div>
              <div className="font-bold text-green-700">{baik}</div>
            </div>
            <div>
              <div className="text-xs text-orange-600">R.Sedang</div>
              <div className="font-bold text-orange-700">{sedang}</div>
            </div>
            <div>
              <div className="text-xs text-red-600">R.Berat</div>
              <div className="font-bold text-red-700">{berat}</div>
            </div>
          </div>
        </div>
      );
    };

    const kondisiKelas = prasarana.kondisiKelas || {};
    const mebeulair = prasarana.mebeulair || {};

    return (
      <div className="space-y-8">
        {/* A. Lahan */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Lahan & Bangunan
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["tanah", "bangunan", "halaman"].map((k) => (
              <div
                key={k}
                className="bg-gray-50 p-4 rounded-lg text-center border"
              >
                <div className="text-xl font-bold text-gray-800">
                  {toNum(prasarana?.ukuran?.[k])}
                  <span className="text-sm font-normal text-gray-500"> m²</span>
                </div>
                <div className="text-xs text-gray-500 capitalize">Luas {k}</div>
              </div>
            ))}
            <div className="bg-gray-50 p-4 rounded-lg text-center border">
              <div className="text-xl font-bold text-gray-800">
                {toNum(prasarana?.gedung?.jumlah)}
              </div>
              <div className="text-xs text-gray-500">Jml Gedung</div>
            </div>
          </div>
        </div>

        {/* B. Detail Ruang Kelas */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
            <School className="h-4 w-4" /> Detail Kondisi Ruang Kelas
          </h4>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-green-600 uppercase">
                    Baik
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-yellow-600 uppercase">
                    R. Ringan
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-orange-600 uppercase">
                    R. Sedang
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-red-600 uppercase">
                    R. Berat
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-red-800 uppercase">
                    R. Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="px-4 py-3 text-center font-bold text-gray-800">
                    {kondisiKelas.total}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">
                    {kondisiKelas.baik}
                  </td>
                  <td className="px-4 py-3 text-center text-yellow-600">
                    {kondisiKelas.rusakRingan}
                  </td>
                  <td className="px-4 py-3 text-center text-orange-600">
                    {kondisiKelas.rusakSedang}
                  </td>
                  <td className="px-4 py-3 text-center text-red-600 font-medium">
                    {kondisiKelas.rusakBerat}
                  </td>
                  <td className="px-4 py-3 text-center text-red-800 font-bold">
                    {kondisiKelas.rusakTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* C. Analisis Kebutuhan */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
            <Construction className="h-4 w-4" /> Analisis Kebutuhan & DAK
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-700">
                {kondisiKelas.kurangRkb}
              </div>
              <div className="text-xs text-red-600">Kurang RKB</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-yellow-700">
                {kondisiKelas.kelebihan}
              </div>
              <div className="text-xs text-yellow-600">Kelebihan</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-700">
                {kondisiKelas.rkbTambahan}
              </div>
              <div className="text-xs text-blue-600">RKB Tambahan</div>
            </div>
            <div className="bg-gray-100 border rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-700">
                {kondisiKelas.lahan || "-"}
              </div>
              <div className="text-xs text-gray-600">Ketersediaan Lahan</div>
            </div>
          </div>

          {/* ✅ UPDATED: Rencana Kegiatan Fisik (Include Rehab R.Kelas) */}
          {(kegiatanFisik.rehabRuangKelas > 0 ||
            kegiatanFisik.pembangunanRKB > 0 ||
            kegiatanFisik.rehabToilet > 0 ||
            kegiatanFisik.pembangunanToilet > 0) && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-blue-800 mb-3">
                Rencana Kegiatan Fisik (DAK)
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">
                    {toNum(kegiatanFisik.rehabRuangKelas)}
                  </div>
                  <div className="text-xs text-blue-600">Rehab R.Kelas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">
                    {toNum(kegiatanFisik.pembangunanRKB)}
                  </div>
                  <div className="text-xs text-blue-600">Pembangunan RKB</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">
                    {toNum(kegiatanFisik.rehabToilet)}
                  </div>
                  <div className="text-xs text-blue-600">Rehab Toilet</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">
                    {toNum(kegiatanFisik.pembangunanToilet)}
                  </div>
                  <div className="text-xs text-blue-600">
                    Pembangunan Toilet
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* D. Ruang Penunjang & Sanitasi */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Ruang Penunjang & Sanitasi
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DetailedRoomItem
              label="Perpustakaan"
              data={getRoomData("library")}
              icon={Library}
              color="text-orange-600"
            />
            <DetailedRoomItem
              label="R. Kepala Sekolah"
              data={getRoomData("kepsek_room")}
              icon={PersonStanding}
            />
            <DetailedRoomItem
              label="R. Guru"
              data={getRoomData("teacher_room")}
              icon={UserCheck}
              color="text-cyan-600"
            />
            <DetailedRoomItem
              label="R. Tata Usaha"
              data={getRoomData("administration_room")}
              icon={Briefcase}
            />
            <DetailedRoomItem
              label="R. UKS"
              data={getRoomData("uks_room")}
              icon={HeartPulse}
              color="text-red-500"
            />
            <DetailedRoomItem
              label="R. BK / Konseling"
              data={getRoomData("bk_room")}
              icon={MessageCircle}
            />
            <DetailedRoomItem
              label="Tempat Ibadah"
              data={getRoomData("worship_place")}
              icon={Building}
            />

            {/* ✅ LOGIC BARU: Lab Umum hanya muncul jika BUKAN SMP dan BUKAN PAUD (Artinya: SD & PKBM) */}
            {!isSmp && !isPaud && (
              <DetailedRoomItem
                label="Lab. Komputer / Umum"
                data={getRoomData("laboratory")}
                icon={Computer}
                color="text-blue-600"
              />
            )}

            {isSmp && (
              <>
                <DetailedRoomItem
                  label="Lab. Komputer"
                  data={getLabData("laboratory_comp")}
                  icon={Computer}
                  color="text-blue-600"
                />
                <DetailedRoomItem
                  label="Lab. Bahasa"
                  data={getLabData("laboratory_langua")}
                  icon={Languages}
                  color="text-green-600"
                />
                <DetailedRoomItem
                  label="Lab. IPA"
                  data={getLabData("laboratory_ipa")}
                  icon={FlaskConical}
                  color="text-purple-600"
                />
                <DetailedRoomItem
                  label="Lab. Fisika"
                  data={getLabData("laboratory_fisika")}
                  icon={FlaskConical}
                  color="text-indigo-600"
                />
                <DetailedRoomItem
                  label="Lab. Biologi"
                  data={getLabData("laboratory_biologi")}
                  icon={FlaskConical}
                  color="text-teal-600"
                />
              </>
            )}

            {/* ✅ DETAIL TOILET SMP */}
            {isSmp ? (
              <>
                <DetailedRoomItem
                  label="Toilet Guru (P)"
                  data={prasarana?.teachers_toilet?.male}
                  icon={Bath}
                  color="text-blue-500"
                />
                <DetailedRoomItem
                  label="Toilet Guru (W)"
                  data={prasarana?.teachers_toilet?.female}
                  icon={Bath}
                  color="text-pink-500"
                />
                <DetailedRoomItem
                  label="Toilet Siswa (P)"
                  data={prasarana?.students_toilet?.male}
                  icon={Bath}
                  color="text-blue-500"
                />
                <DetailedRoomItem
                  label="Toilet Siswa (W)"
                  data={prasarana?.students_toilet?.female}
                  icon={Bath}
                  color="text-pink-500"
                />
              </>
            ) : (
              <DetailedRoomItem
                label="Toilet"
                data={getRoomData("toilets")}
                icon={Bath}
              />
            )}

            <DetailedRoomItem
              label="Rumah Dinas"
              data={getRoomData("official_residences")}
              icon={Home}
            />
          </div>
        </div>

        {/* E. Mebeulair */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
            <Armchair className="h-4 w-4" /> Mebeulair & TIK
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-bold text-gray-700">Meja Siswa</h5>
                <Badge variant="outline">{mebeulair.meja?.total || 0}</Badge>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="flex-1 bg-green-100 text-green-700 py-1 px-2 rounded text-center font-medium">
                  Baik: {toNum(mebeulair.meja?.baik)}
                </span>
                <span className="flex-1 bg-red-100 text-red-700 py-1 px-2 rounded text-center font-medium">
                  Rusak: {toNum(mebeulair.meja?.rusak)}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-bold text-gray-700">Kursi Siswa</h5>
                <Badge variant="outline">{mebeulair.kursi?.total || 0}</Badge>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="flex-1 bg-green-100 text-green-700 py-1 px-2 rounded text-center font-medium">
                  Baik: {toNum(mebeulair.kursi?.baik)}
                </span>
                <span className="flex-1 bg-red-100 text-red-700 py-1 px-2 rounded text-center font-medium">
                  Rusak: {toNum(mebeulair.kursi?.rusak)}
                </span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full text-blue-600 shadow-sm">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {toNum(mebeulair.komputer)}
                </div>
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                  PC / Laptop (Sekolah)
                </div>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-700">
                  {toNum(mebeulair.chromebook)}
                </div>
                <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                  Chromebook (Bantuan)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInstitutionalInfo = () => {
    const InfoRow = ({ label, value }) => (
      <div className="flex justify-between py-2 border-b last:border-0 hover:bg-gray-50 px-2 rounded">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {value || "-"}
        </span>
      </div>
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Umum
          </h4>
          <InfoRow
            label="Alat Rumah Tangga"
            value={kelembagaan.peralatanRumahTangga}
          />
          <InfoRow label="Status Pembinaan" value={kelembagaan.pembinaan} />
          <InfoRow label="Status Asesmen" value={kelembagaan.asesmen} />
          <InfoRow
            label="Menyelenggarakan Belajar"
            value={kelembagaan.menyelenggarakanBelajar}
          />
          <InfoRow
            label="Melaksanakan Rekomendasi"
            value={kelembagaan.melaksanakanRekomendasi}
          />
          <InfoRow label="Siap Dievaluasi" value={kelembagaan.siapDievaluasi} />
        </div>
        <div className="border rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileX2 className="h-4 w-4" /> Perizinan & Kurikulum
          </h4>
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                BOP
              </h5>
              <InfoRow label="Pengelola" value={kelembagaan.bop?.pengelola} />
              <InfoRow
                label="Tenaga Ditingkatkan"
                value={kelembagaan.bop?.tenagaPeningkatan}
              />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Izin & Kurikulum
              </h5>
              <InfoRow
                label="Izin Pengendalian"
                value={kelembagaan.perizinan?.pengendalian}
              />
              <InfoRow
                label="Izin Kelayakan"
                value={kelembagaan.perizinan?.kelayakan}
              />
              <InfoRow label="Silabus" value={kelembagaan.kurikulum?.silabus} />
              <InfoRow
                label="Kompetensi Dasar"
                value={kelembagaan.kurikulum?.kompetensiDasar}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabsList = [
    {
      id: "basic",
      label: "Info Dasar",
      icon: <School className="w-4 h-4" />,
      render: renderBasicInfo,
    },
    {
      id: "students",
      label: "Siswa & Rombel",
      icon: <Users className="w-4 h-4" />,
      render: renderStudentsInfo,
    },
    {
      id: "teachers",
      label: "Guru",
      icon: <UserCheck className="w-4 h-4" />,
      render: renderTeachersInfo,
    },
    {
      id: "facilities",
      label: "Prasarana",
      icon: <Building className="w-4 h-4" />,
      render: renderFacilitiesInfo,
    },
    {
      id: "graduation",
      label: "Kelulusan",
      icon: <TrendingUp className="w-4 h-4" />,
      render: renderGraduationInfo,
    },
    {
      id: "institutional",
      label: "Kelembagaan",
      icon: <ClipboardList className="w-4 h-4" />,
      render: renderInstitutionalInfo,
    },
  ];

  return (
    <Tabs defaultValue="basic" className="space-y-6">
      <div className="border-b bg-white sticky top-0 z-10">
        <TabsList className="h-auto p-0 bg-transparent gap-4 w-full justify-start overflow-x-auto no-scrollbar">
          {tabsList.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 bg-transparent font-medium text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            >
              {t.icon} <span className="ml-2">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabsList.map((t) => (
        <TabsContent
          key={t.id}
          value={t.id}
          className="p-1 animate-in fade-in-50 duration-300"
        >
          {t.render()}
        </TabsContent>
      ))}
    </Tabs>
  );
}