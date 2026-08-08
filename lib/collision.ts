import type { CardState, DoctorDTO, DayKey } from "./types";

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

// Apakah dokter ini praktek di hari tsb?
export function isPracticingOn(card: DoctorDTO, day: DayKey): boolean {
  return card.practiceDays.includes(day);
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
//   3. HIJAU      — tabrakan jam dgn outlet SAMA → normal (memang sudah di situ)
//   4. default    — tidak ada masalah
export function getCardState(
  card: DoctorDTO,
  columnDay: DayKey,
  siblings: DoctorDTO[]
): CardIssue {
  // 1. Cek hari praktek (hard invalid)
  if (!isPracticingOn(card, columnDay)) {
    return {
      state: "invalid-day",
      message: `Dokter ini praktek ${card.practiceDays.join(", ").toLowerCase()}, bukan ${columnDay.toLowerCase()}`,
    };
  }

  // 2. Cek tabrakan waktu dengan card lain di kolom yang sama
  let hasSameOutletCollision = false;
  let hasDifferentOutletCollision = false;
  const collided: string[] = [];

  for (const s of siblings) {
    if (s.id === card.id) continue;
    if (
      timesOverlap(card.practiceStart, card.practiceEnd, s.practiceStart, s.practiceEnd)
    ) {
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
  return all.filter(
    (d) => d.id !== card.id && d.scheduledDay === columnDay
  );
}
