// src/hooks/useDataInput.js
import { useState, useCallback, useEffect } from "react";
import { dataInputService } from "@/services/dataInputService";

export function useDataInput(config, initialData) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Fungsi existing: Update satu field manual (ketik satu-satu)
  const handleChange = useCallback(
    (path, value) => {
      setFormData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev));
        const keys = path.split(".");
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = current[keys[i]] || {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });

      // Hapus error jika field tersebut diubah
      if (errors[path]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      }
    },
    [errors]
  );

  // ✅ FUNGSI BARU: Bulk Update (Khusus untuk Import Excel)
  // Menimpa seluruh state formData sekaligus tanpa memicu re-render berkali-kali
  const handleBulkUpdate = useCallback((newData) => {
    setFormData(newData);
    // Kita reset error juga karena asumsinya user baru import data baru
    setErrors({});
  }, []);

  // Fungsi existing: Auto-hitung total siswa saat data siswa berubah
  useEffect(() => {
    let total = 0;

    if (config.isPkbm && config.pakets) {
      total = Object.entries(config.pakets).reduce((sum, [key, paket]) => {
        const pKey = `paket${key}`;
        return (
          sum +
          paket.grades.reduce((t, g) => {
            const kelas = formData.siswa[pKey]?.[`kelas${g}`] || { l: 0, p: 0 };
            return t + (Number(kelas.l) || 0) + (Number(kelas.p) || 0);
          }, 0)
        );
      }, 0);
    } else if (config.isPaud && config.rombelTypes) {
      total = config.rombelTypes.reduce((sum, t) => {
        const grp = formData.siswa[t.key] || { l: 0, p: 0 };
        return sum + (Number(grp.l) || 0) + (Number(grp.p) || 0);
      }, 0);
    } else if (config.grades) {
      total = config.grades.reduce((sum, g) => {
        const kelas = formData.siswa[`kelas${g}`] || { l: 0, p: 0 };
        return sum + (Number(kelas.l) || 0) + (Number(kelas.p) || 0);
      }, 0);
    }

    // Hanya update jika total berbeda untuk menghindari infinite loop
    if (Number(formData.siswa.jumlahSiswa) !== total) {
      handleChange("siswa.jumlahSiswa", total);
    }
  }, [formData.siswa, config, handleChange]);

  // Fungsi existing: Validasi field wajib
  const validate = (fields) => {
    const newErrors = {};
    let isValid = true;

    fields.forEach((field) => {
      const val = field
        .split(".")
        .reduce((o, k) => (o ? o[k] : undefined), formData);
      if ((val === "" || val === undefined) && field !== "optional") {
        newErrors[field] = "Wajib diisi";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Fungsi existing: Submit data
  const submit = async (schoolType) => {
    setSaving(true);
    const result = await dataInputService.submitData(schoolType, formData);
    setSaving(false);
    return result;
  };

  return {
    formData,
    handleChange,
    handleBulkUpdate, // ✅ Diekspor agar bisa dipakai di komponen
    errors,
    validate,
    submit,
    saving,
  };
}
