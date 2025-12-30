// src/app/dashboard/paud/input/form/page.js
import { redirect } from "next/navigation";

export default function PaudManualFormPage() {
  // Route legacy: jangan dipakai lagi karena hardcode PAUD menghilangkan opsi TK.
  // Arahkan ke halaman selector PAUD/TK.
  redirect("/dashboard/paud/input");
}
