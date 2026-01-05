// src/app/components/LocationPickerMap.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icon issue di Next.js/Leaflet
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png";

export default function LocationPickerMap({
  onSelectLocation,
  initialCoordinates,
  readOnly = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Pastikan komponen hanya render di client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 1. Guard Clause: Pastikan berjalan di client dan container sudah ada
    if (
      typeof window === "undefined" ||
      !mapContainerRef.current ||
      !isMounted
    ) {
      return;
    }

    // 2. Cegah Double Initialization (Masalah Utama Error appendChild)
    if (mapInstanceRef.current) {
      // Jika peta sudah ada, update view-nya saja jika koordinat berubah
      if (initialCoordinates) {
        mapInstanceRef.current.setView(initialCoordinates, 13);
        if (markerRef.current) {
          markerRef.current.setLatLng(initialCoordinates);
        }
      }
      return;
    }

    // --- INISIALISASI PETA ---

    // Fix Icon Default Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });

    // Tentukan koordinat awal (Default: Garut Kota)
    const startCoords = initialCoordinates || [-7.2167, 107.9];

    // Buat Instance Peta
    const map = L.map(mapContainerRef.current).setView(startCoords, 13);
    mapInstanceRef.current = map;

    // Tambahkan Tile Layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Tambahkan Marker Awal jika ada koordinat
    if (initialCoordinates) {
      const marker = L.marker(initialCoordinates).addTo(map);
      markerRef.current = marker;
    }

    // Event Listener Klik (Hanya jika tidak readOnly)
    if (!readOnly) {
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;

        // Pindahkan atau buat marker baru
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const newMarker = L.marker([lat, lng]).addTo(map);
          markerRef.current = newMarker;
        }

        // Kirim data ke parent
        if (onSelectLocation) {
          onSelectLocation(lat, lng);
        }
      });
    }

    // Force resize agar peta tidak abu-abu/berantakan saat tab switch
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // 3. CLEANUP FUNCTION (Sangat Penting untuk mencegah error appendChild)
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isMounted, initialCoordinates, readOnly, onSelectLocation]);

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center text-muted-foreground animate-pulse rounded-lg">
        Memuat Peta...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden z-0">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full z-10"
      />
    </div>
  );
}
