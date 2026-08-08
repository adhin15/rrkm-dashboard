import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DAY_ORDER, type DayKey, type ScheduleDTO } from "@/lib/types";

function normalizeSchedules(schedules: unknown): ScheduleDTO[] {
  if (!Array.isArray(schedules)) return [];
  const valid: ScheduleDTO[] = [];
  for (const s of schedules) {
    const day = (s?.day ?? "").toUpperCase();
    if (!DAY_ORDER.includes(day as DayKey)) continue;
    const start = String(s?.startTime ?? "").trim();
    const end = String(s?.endTime ?? "").trim();
    if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) continue;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (sh * 60 + sm >= eh * 60 + em) continue;
    valid.push({ day: day as DayKey, startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`, endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}` });
  }
  return valid;
}

// ===== POST /api/doctors/bulk — import banyak dokter dari Excel =====
// Body: { doctors: [{ name, outlet, schedules: [{day,startTime,endTime}] }] }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const doctors = Array.isArray(body?.doctors) ? body.doctors : [];

  if (doctors.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada data dokter untuk diimpor", imported: 0 },
      { status: 400 }
    );
  }

  const maxPos = await prisma.doctor.aggregate({
    _max: { position: true },
    where: { scheduledDay: null },
  });
  let nextPos = (maxPos._max.position ?? 0) + 1;

  const created = [];
  const skipped = [];

  for (const row of doctors) {
    const name = (row.name ?? "").toString().trim();
    const outlet = (row.outlet ?? "").toString().trim();
    const schedules = normalizeSchedules(row.schedules);
    const flexible = row.flexible === true;

    if (!name || !outlet || schedules.length === 0) {
      skipped.push(name || "(tanpa nama)");
      continue;
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        outlet,
        scheduledDay: null,
        position: nextPos++,
        flexible,
        schedules: { create: schedules },
      },
    });
    created.push(doctor);
  }

  return NextResponse.json({
    imported: created.length,
    skipped: skipped.length,
    skippedNames: skipped,
  });
}
