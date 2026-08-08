import type { CardState, DoctorDTO, DayKey, ScheduleDTO } from "./types";
import { schedulesOnDay, practiceDaysOf } from "./types";

// Ubah "HH:mm" menjadi menit sejak tengah malam (untuk perbandingan)
export function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Apakah dua range waktu saling tabrakan? [startA, endA) vs [startB, endB)
export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return parseTime(startA) < parseTime(endB) && parseTime(startB) < parseTime(endA);
}

// Apakah dua daftar sesi saling tabrakan (ada pasangan yang overlap)?
export function schedulesOverlap(a: ScheduleDTO[], b: ScheduleDTO[]): boolean {
  for (const sa of a) {
    for (const sb of b) {
      if (timesOverlap(sa.startTime, sa.endTime, sb.startTime, sb.endTime)) {
        return true;
      }
    }
  }
  return false;
}

// Apakah dokter ini praktek di hari tsb?
export function isPracticingOn(card: DoctorDTO, day: DayKey): boolean {
  return schedulesOnDay(card, day).length > 0;
}

// Deskripsi issue untuk ditampilkan ke user (tooltip / banner)
export interface CardIssue {
  state: CardState;
  message: string;
}

// Evaluasi state sebuah card terhadap kolom (hari) dan card lain di kolom yang sama.
//
// Prioritas warna (dari yang paling penting):
//   1. MERAH      — hari bukan hari praktek dokter → INVALID, drop diblok
//   2. MERAH MUDA — tabrakan jam dgn outlet BEDA → soft warning (tetap boleh drop)
//   3. HIJAU      — tabrakan jam dgn outlet SAMA → normal (memang sedang di lokasi yg sama)
//   4. default    — tidak ada masalah
export function getCardState(
  card: DoctorDTO,
  columnDay: DayKey,
  siblings: DoctorDTO[]
): CardIssue {
  // 1. Cek hari praktek (hard invalid) — tetap tampil walau visited
  if (!isPracticingOn(card, columnDay)) {
    return {
      state: "invalid-day",
      message: `Dokter ini praktek ${practiceDaysOf(card)
        .map((d) => d.toLowerCase())
        .join(", ")}, bukan ${columnDay.toLowerCase()}`,
    };
  }

  // Jadwal card di hari kolom (bisa multi-sesi)
  const mySchedules = schedulesOnDay(card, columnDay);

  // Dokter flexible (jam tidak pasti) tidak pernah dianggap tabrakan,
  // dan tidak ikut menghitung tabrakan untuk dirinya sendiri.
  if (card.flexible) {
    return { state: "ok", message: "Jadwal fleksibel" };
  }

  // Dokter sudah dikunjungi (visited): tetap ikut hitungan tabrakan utk
  // dokter lain, tapi card-nya sendiri TIDAK menampilkan indikator warna.
  if (card.visited) {
    return { state: "ok", message: "Sudah dikunjungi" };
  }

  // 2. Cek tabrakan waktu dengan card lain di kolom yang sama
  let hasSameOutletCollision = false;
  let hasDifferentOutletCollision = false;
  const collided: string[] = [];

  for (const s of siblings) {
    if (s.id === card.id) continue;
    // Dokter flexible tidak menyebabkan tabrakan (jadwalnya tidak pasti)
    if (s.flexible) continue;
    // Catatan: s.visited TETAP menyebabkan tabrakan (tidak di-skip),
    // sesuai keputusan "tetap masuk pool tabrakan".
    const theirSchedules = schedulesOnDay(s, columnDay);
    if (theirSchedules.length === 0) continue;

    if (schedulesOverlap(mySchedules, theirSchedules)) {
      collided.push(s.name);
      if (s.outlet === card.outlet) {
        hasSameOutletCollision = true;
      } else {
        hasDifferentOutletCollision = true;
      }
    }
  }

  // Tabrakan dengan outlet berbeda lebih prioritas (konflik nyata).
  if (hasDifferentOutletCollision) {
    return {
      state: "collision-different-outlet",
      message: `Tabrakan jam dgn ${collided.join(", ")} (outlet beda)`,
    };
  }

  if (hasSameOutletCollision) {
    return {
      state: "collision-same-outlet",
      message: `Tabrakan jam dgn ${collided.join(", ")} (outlet sama)`,
    };
  }

  return { state: "ok", message: "Jadwal OK" };
}

// Helper: filter card lain di kolom yang sama (untuk evaluasi)
export function siblingsOf(card: DoctorDTO, all: DoctorDTO[], columnDay: DayKey): DoctorDTO[] {
  return all.filter((d) => d.id !== card.id && d.scheduledDay === columnDay);
}
