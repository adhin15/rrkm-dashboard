import type { DoctorDTO, DayKey, ScheduleDTO } from "./types";
import { schedulesOnDay } from "./types";
import { parseTime } from "./collision";

// Opsi sorting card di dalam kolom
export type SortOption = "position" | "outlet" | "name";

export const SORT_LABELS: Record<SortOption, string> = {
  position: "Urutan Drag",
  outlet: "Rumah Sakit",
  name: "Nama",
};

// Apakah schedule masuk dalam range jam [start, end]
function inTimeRange(sched: ScheduleDTO, start: string, end: string): boolean {
  // overlap: sched.start < end && start < sched.end
  return parseTime(sched.startTime) < parseTime(end) && parseTime(start) < parseTime(sched.endTime);
}

// Filter: apakah dokter lolos filter hari + range jam.
// - filterDays kosong = semua hari (tanpa filter hari)
// - start/end kosong = tanpa filter jam (00:00-24:00)
export function passesFilter(
  doctor: DoctorDTO,
  filterDays: DayKey[],
  filterStart: string,
  filterEnd: string
): boolean {
  // Filter hari: dokter harus praktek di minimal satu hari terpilih
  if (filterDays.length > 0) {
    const practicesInSelected = filterDays.some((d) => schedulesOnDay(doctor, d).length > 0);
    if (!practicesInSelected) return false;
  }

  // Filter range jam: minimal satu jadwal dokter overlap dengan range
  if (filterStart && filterEnd) {
    // hari mana yang jadi acuan untuk cek jam? pakai semua schedule dokter.
    const hasOverlap = doctor.schedules.some((s) => inTimeRange(s, filterStart, filterEnd));
    if (!hasOverlap) return false;
  }

  return true;
}

// Sort doctor (dipakai untuk urutan dalam kolom)
export function sortDoctors(doctors: DoctorDTO[], sortBy: SortOption): DoctorDTO[] {
  const arr = [...doctors];
  if (sortBy === "outlet") {
    arr.sort((a, b) => a.outlet.localeCompare(b.outlet) || a.name.localeCompare(b.name));
  } else if (sortBy === "name") {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // position (urutan drag) — default dari DB
    arr.sort((a, b) => a.position - b.position);
  }
  return arr;
}
