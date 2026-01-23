// src/hooks/useDataInput.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dataInputService } from "@/services/dataInputService";
import { getIn, setIn } from "@/lib/utils/objectPath";
import { createInitialFormData } from "@/lib/config/createInitialFormData";
import { toast } from "sonner";

// UPDATE: Tambahkan parameter `isEditMode` default false
export function useDataInput({
  config,
  initialData,
  schoolType,
  schoolId = null,
  isEditMode = false,
}) {
  // 1. GENERATE STORAGE KEY (FIX FINAL)
  const storageKey = useMemo(() => {
    if (!schoolType) return null;

    // JIKA MODE EDIT:
    if (isEditMode) {
      // Kalau ID belum ada (masih loading), JANGAN generate key (return null).
      // Jangan fallback ke 'draft_create_', bahaya!
      if (!schoolId) return null;
      return `draft_edit_${schoolType}_${schoolId}`;
    }

    // JIKA MODE INPUT BARU:
    return `draft_create_${schoolType}`;
  }, [schoolType, schoolId, isEditMode]);

  // 2. STATE INITIALIZATION
  const [formState, setFormState] = useState(() => {
    // A. Cek Draft (Hanya jika key valid/tidak null)
    if (typeof window !== "undefined" && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return { data: parsed, isDirty: true };
          }
        }
      } catch (e) {
        console.error("Gagal load draft:", e);
      }
    }

    // B. Cek Initial Data
    if (initialData) {
      return { data: initialData, isDirty: false };
    }

    // C. Fallback Template
    const emptyTemplate = config ? createInitialFormData(config) : {};
    return { data: emptyTemplate, isDirty: false };
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Helper variables
  const formData = formState.data;
  const isDirty = formState.isDirty;

  // 3. EFFECT: Sinkronisasi Data Server
  useEffect(() => {
    if (!initialData) return;

    setFormState((prev) => {
      // Jika user sudah ngetik, jangan timpa.
      if (prev.isDirty) return prev;

      // Update jika data server berbeda
      if (JSON.stringify(prev.data) !== JSON.stringify(initialData)) {
        return { data: initialData, isDirty: false };
      }
      return prev;
    });
  }, [initialData]);

  // 4. EFFECT: Auto-Save
  useEffect(() => {
    if (!storageKey || !formData) return;

    if (isDirty) {
      const handler = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [formData, isDirty, storageKey]);

  /**
   * Handle Change
   */
  const handleChange = useCallback((path, value) => {
    setFormState((prev) => ({
      data: prev.data ? setIn(prev.data, path, value) : prev.data,
      isDirty: true,
    }));

    setErrors((prev) => {
      if (!prev || !Object.prototype.hasOwnProperty.call(prev, path))
        return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  /**
   * Handle Bulk Update
   */
  const handleBulkUpdate = useCallback(
    (newData) => {
      setFormState({ data: newData, isDirty: true });
      setErrors({});

      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newData));
          toast.success("Data Excel berhasil dimuat.");
        } catch (e) {
          console.error(e);
        }
      }
    },
    [storageKey],
  );

  // --- Logic Hitung Siswa ---
  const computedTotalSiswa = useMemo(() => {
    if (!formData?.siswa || !config) return null;

    let total = 0;
    if (config.isPkbm && config.pakets) {
      total = Object.entries(config.pakets).reduce((sum, [key, paket]) => {
        const pKey = `paket${key}`;
        const grades = Array.isArray(paket?.grades) ? paket.grades : [];
        const subtotal = grades.reduce((t, g) => {
          const kelas = formData.siswa[pKey]?.[`kelas${g}`] || { l: 0, p: 0 };
          return t + (Number(kelas.l) || 0) + (Number(kelas.p) || 0);
        }, 0);
        return sum + subtotal;
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
    return total;
  }, [formData?.siswa, config]);

  useEffect(() => {
    if (computedTotalSiswa == null) return;
    const current = Number(getIn(formData, "siswa.jumlahSiswa", 0)) || 0;
    if (current !== computedTotalSiswa) {
      setFormState((prev) => ({
        ...prev,
        data: setIn(prev.data, "siswa.jumlahSiswa", computedTotalSiswa),
        isDirty: true,
      }));
    }
  }, [computedTotalSiswa, formData?.siswa?.jumlahSiswa]);

  const validate = useCallback(
    (fields) => {
      const newErrors = {};
      let isValid = true;
      if (!Array.isArray(fields) || fields.length === 0) return true;

      for (const field of fields) {
        const val = getIn(formData, field, undefined);
        if ((val === "" || val === undefined) && field !== "optional") {
          newErrors[field] = "Wajib diisi";
          isValid = false;
        }
      }
      setErrors(newErrors);
      return isValid;
    },
    [formData],
  );

  const submit = useCallback(
    async (targetSchoolType) => {
      setSaving(true);
      try {
        const res = await dataInputService.submitData(
          targetSchoolType,
          formData,
        );

        if (storageKey) {
          localStorage.removeItem(storageKey);
          setFormState((prev) => ({ ...prev, isDirty: false }));
        }

        return res;
      } catch (err) {
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [formData, storageKey],
  );

  const clearDraft = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    const emptyTemplate = config ? createInitialFormData(config) : {};
    setFormState({ data: initialData || emptyTemplate, isDirty: false });
    toast.info("Draft formulir telah direset.");
  }, [storageKey, initialData, config]);

  return {
    formData,
    handleChange,
    handleBulkUpdate,
    errors,
    validate,
    submit,
    saving,
    clearDraft,
    isDirty,
  };
}
