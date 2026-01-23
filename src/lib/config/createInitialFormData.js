// src/lib/config/createInitialFormData.js
// -----------------------------------------------------------------------------
// Adapter file untuk menjaga kompatibilitas import:
//   import createInitialFormData from "@/lib/config/createInitialFormData";
//
// Sumber implementasi "asli" ada di:
//   src/lib/config/schoolConfig.js
// dan diekspor sebagai named export: createInitialFormData
//
// File ini sengaja hanya re-export agar:
// - Tidak menduplikasi logic (mencegah perilaku initial state divergen)
// - Perilaku initial state tetap IDENTIK dengan versi yang sudah jalan
//   (Excel import + Stepper + payloadBuilder aman)
// -----------------------------------------------------------------------------

import { createInitialFormData as createInitialFormDataFromSchoolConfig } from "./schoolConfig";

// Default export untuk kompatibilitas dengan import yang kamu pakai sekarang:
export default createInitialFormDataFromSchoolConfig;

// Named export opsional (kalau suatu saat kamu mau):
export { createInitialFormDataFromSchoolConfig as createInitialFormData };
