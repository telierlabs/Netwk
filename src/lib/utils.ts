import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── FIX: Format Tanggal Manual & Anti-NaN ──
export function formatTimestamp() {
  const now = new Date();
  
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const dayName = days[now.getDay()];
  const date = now.getDate().toString().padStart(2, '0');
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');

  // Hasil selalu konsisten, contoh: "MINGGU, 24 MEI 2026 12:51"
  // Bebas dari kata aneh bawaan browser yang bikin error NaN
  return `${dayName}, ${date} ${monthName} ${year} ${hours}:${minutes}`.toUpperCase();
}
