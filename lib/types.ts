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

// Representasi Doctor yang dipakai di client (serializable)
export interface DoctorDTO {
  id: string;
  name: string;
  outlet: string;
  practiceDays: DayKey[];
  practiceStart: string; // "HH:mm"
  practiceEnd: string; // "HH:mm"
  scheduledDay: DayKey | null;
  position: number;
}

// Hasil evaluasi state sebuah card
export type CardState =
  | "invalid-day" // MERAH — hari bukan hari praktek
  | "collision-different-outlet" // MERAH MUDA — tabrakan jam, beda outlet
  | "collision-same-outlet" // HIJAU — tabrakan jam, outlet sama (aman)
  | "ok"; // normal
