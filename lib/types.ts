// Tipe bersama untuk aplikasi RRKM Dashboard

export type DayKey =
  | "SENIN"
  | "SELASA"
  | "RABU"
  | "KAMIS"
  | "JUMAT"
  | "SABTU";

// Urutan hari — juga dipakai untuk sorting kolom
export const DAY_ORDER: DayKey[] = [
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
];

// Label tampilan (singkat + panjang)
export const DAY_LABEL: Record<DayKey, { short: string; long: string }> = {
  SENIN: { short: "Sen", long: "Senin" },
  SELASA: { short: "Sel", long: "Selasa" },
  RABU: { short: "Rab", long: "Rabu" },
  KAMIS: { short: "Kam", long: "Kamis" },
  JUMAT: { short: "Jum", long: "Jumat" },
  SABTU: { short: "Sab", long: "Sabtu" },
};

// Constraint dari case RRKM: Sabtu half-day, target minimal dokter/hari
export const SATURDAY_END = "12:00";
export const MIN_DOCTORS_PER_DAY = 10;

// Satu sesi jadwal praktek (dalam satu hari)
export interface ScheduleDTO {
  day: DayKey;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

// Representasi Doctor yang dipakai di client (serializable)
export interface DoctorDTO {
  id: string;
  name: string;
  outlet: string;
  schedules: ScheduleDTO[]; // jadwal per hari (bisa multi-sesi per hari)
  scheduledDay: DayKey | null;
  position: number;
  flexible: boolean; // true = jam tidak pasti, tidak ikut deteksi tabrakan
  visited: boolean; // true = sudah dikunjungi/done
  priority: boolean; // true = wajib dikunjungi (nama biru neon + glow)
}

// Helper: jadwal dokter untuk hari tertentu (bisa kosong / multi-sesi)
export function schedulesOnDay(doctor: DoctorDTO, day: DayKey): ScheduleDTO[] {
  return doctor.schedules.filter((s) => s.day === day);
}

// Helper: hari-hari praktek dokter (unique, sesuai urutan DAY_ORDER)
export function practiceDaysOf(doctor: DoctorDTO): DayKey[] {
  const set = new Set<DayKey>(doctor.schedules.map((s) => s.day));
  return DAY_ORDER.filter((d) => set.has(d));
}

// Hasil evaluasi state sebuah card
export type CardState =
  | "invalid-day" // MERAH — hari bukan hari praktek
  | "collision-different-outlet" // MERAH MUDA — tabrakan jam, beda outlet
  | "collision-same-outlet" // HIJAU — tabrakan jam, outlet sama (aman)
  | "ok"; // normal

// ===== Helper duplicate card =====

// Ambil "base name" tanpa suffix duplikat "(N)".
// "BUDI AGUNG (2)" -> "BUDI AGUNG"; "BUDI AGUNG" -> "BUDI AGUNG"
export function baseName(name: string): string {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

// Hitung nama untuk duplikat berikutnya, konsisten & re-use angka yang kosong.
// - Duplicate "BUDI AGUNG" (belum ada duplikat) -> "BUDI AGUNG (2)"
// - Hapus "(2)", duplicate lagi -> tetap "(2)" (angka 2 kosong, di-reuse)
// - Duplicate "BUDI AGUNG (2)" -> "BUDI AGUNG (3)" (angka sumber dianggap dipakai)
// - Duplicate "BUDI AGUNG" saat "(2)" & "(3)" ada -> "(4)" (angka terkecil kosong)
export function nextDuplicateName(allNames: string[], sourceName: string): string {
  const base = baseName(sourceName);
  const used = new Set<number>();
  for (const n of allNames) {
    const m = n.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (m && m[1].trim() === base) used.add(Number(m[2]));
  }
  // Angka card sumber sendiri dianggap dipakai, supaya duplicate card yang
  // sudah punya suffix menghasilkan angka berikutnya (bukan angka yang sama).
  const srcM = sourceName.match(/^(.+?)\s*\((\d+)\)\s*$/);
  if (srcM && srcM[1].trim() === base) used.add(Number(srcM[2]));
  let i = 2;
  while (used.has(i)) i++;
  return `${base} (${i})`;
}
