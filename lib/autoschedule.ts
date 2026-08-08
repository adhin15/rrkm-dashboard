import type { DayKey, DoctorDTO, ScheduleDTO } from "./types";
import { DAY_ORDER } from "./types";
import { schedulesOnDay } from "./types";
import { parseTime } from "./collision";

// Apakah dua kumpulan sesi saling tabrakan?
function overlaps(a: ScheduleDTO[], b: ScheduleDTO[]): boolean {
  for (const x of a) {
    for (const y of b) {
      if (parseTime(x.startTime) < parseTime(y.endTime) && parseTime(y.startTime) < parseTime(x.endTime)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Auto-assign: susun jadwal otomatis untuk semua dokter yang masih di Pool.
 *
 * Constraint (dari case RRKM):
 *  - 1 dokter = 1 kunjungan (hanya di-assign ke 1 hari)
 *  - 2 dokter beda outlet di hari sama tidak boleh tabrakan jam praktek
 *    (outlet sama boleh overlap)
 *  - Sabtu half-day: hanya dokter yang jam Sabtunya selesai <= 12:00
 *  - Target lunak ~10 dokter/hari
 *
 * Prioritas:
 *  - Dokter ber-flag `priority` dijadwalkan duluan
 *  - Outlet besar diklaster di hari yang sama (mengurangi bolak-balik)
 *  - Jaga preferensi maksimal ~2 outlet/hari
 *
 * Mengembalikan map doctorId -> dayKey yang di-assign.
 * Dokter yang tidak bisa masuk jadwal (tanpa collision) di-skip.
 */
export function autoAssign(doctors: DoctorDTO[]): Record<string, DayKey> {
  const assignments: Record<string, DayKey> = {};
  const doctorById = new Map(doctors.map((d) => [d.id, d]));
  const dayAssignments: Record<string, string[]> = {
    SENIN: [], SELASA: [], RABU: [], KAMIS: [], JUMAT: [], SABTU: [],
  };
  const dayOutlets: Record<string, Set<string>> = {
    SENIN: new Set(), SELASA: new Set(), RABU: new Set(),
    KAMIS: new Set(), JUMAT: new Set(), SABTU: new Set(),
  };

  // Ukuran outlet (berapa dokter di outlet itu) — untuk klaster outlet besar
  const outletSize: Record<string, number> = {};
  for (const d of doctors) {
    outletSize[d.outlet] = (outletSize[d.outlet] || 0) + 1;
  }

  function canPlace(doctor: DoctorDTO, day: DayKey): boolean {
    const sched = schedulesOnDay(doctor, day);
    if (sched.length === 0) return false; // tidak praktek di hari itu
    if (day === "SABTU" && sched.some((s) => parseTime(s.endTime) > parseTime("12:00"))) {
      return false; // Sabtu half-day
    }
    for (const id of dayAssignments[day]) {
      const other = doctorById.get(id);
      if (!other) continue;
      if (other.outlet === doctor.outlet) continue; // outlet sama boleh overlap
      if (overlaps(sched, schedulesOnDay(other, day))) {
        return false; // tabrakan waktu dgn outlet beda
      }
    }
    return true;
  }

  // Urutan pemrosesan: prioritas dulu -> outlet besar -> nama
  const ordered = [...doctors].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    const sa = outletSize[a.outlet] || 0;
    const sb = outletSize[b.outlet] || 0;
    if (sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name);
  });

  for (const doctor of ordered) {
    if (assignments[doctor.id]) continue;

    let bestDay: DayKey | null = null;
    let bestScore = -Infinity;

    for (const day of DAY_ORDER) {
      if (!canPlace(doctor, day)) continue;

      let score = 0;
      const alreadyHere = dayOutlets[day].has(doctor.outlet);
      if (alreadyHere) score += 100; // klaster outlet yang sama di hari sama
      if (dayOutlets[day].size < 2) score += 20; // jaga <=2 outlet/hari
      else if (!alreadyHere) score -= 60; // penalti jadikan hari ke-3 outlet
      if (dayAssignments[day].length < 10) score += 5; // bantu capai target
      if (doctor.priority) score += 10; // prioritas

      if (score > bestScore) {
        bestScore = score;
        bestDay = day;
      }
    }

    if (bestDay) {
      assignments[doctor.id] = bestDay;
      dayAssignments[bestDay].push(doctor.id);
      dayOutlets[bestDay].add(doctor.outlet);
    }
  }

  return assignments;
}
