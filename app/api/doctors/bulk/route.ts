import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DAY_ORDER, type DayKey } from "@/lib/types";

function parseDays(raw: string): DayKey[] {
  return raw
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => DAY_ORDER.includes(s as DayKey)) as DayKey[];
}

// ===== POST /api/doctors/bulk — import banyak dokter dari Excel =====
// Body: { doctors: [{ name, outlet, practiceDays, practiceStart, practiceEnd }] }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const doctors = Array.isArray(body?.doctors) ? body.doctors : [];

  if (doctors.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada data dokter untuk diimpor", imported: 0 },
      { status: 400 }
    );
  }

  // Ambil posisi awal terakhir di Pool supaya tidak tabrakan
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
    const days = parseDays((row.practiceDays ?? "").toString());

    if (!name || !outlet || days.length === 0 || !row.practiceStart || !row.practiceEnd) {
      skipped.push(name || "(tanpa nama)");
      continue;
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        outlet,
        practiceDays: days.join(","),
        practiceStart: row.practiceStart.toString(),
        practiceEnd: row.practiceEnd.toString(),
        scheduledDay: null,
        position: nextPos++,
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
