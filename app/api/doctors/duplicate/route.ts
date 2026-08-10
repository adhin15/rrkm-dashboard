import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Doctor, Schedule } from "@prisma/client";
import type { DayKey } from "@/lib/types";
import { nextDuplicateName } from "@/lib/types";

type DoctorWithSchedules = Doctor & { schedules: Schedule[] };

function toDTO(d: DoctorWithSchedules) {
  return {
    id: d.id,
    name: d.name,
    outlet: d.outlet,
    schedules: d.schedules.map((s) => ({
      day: s.day as DayKey,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    scheduledDay: d.scheduledDay as DayKey | null,
    position: d.position,
    flexible: d.flexible,
    visited: d.visited,
    priority: d.priority,
  };
}

// ===== POST /api/doctors/duplicate — duplikat card (kunjungan ke-2) =====
// Salin data card (outlet, jadwal, flexible, priority) jadi record baru.
// - Nama baru = base name + suffix "(N)" (konsisten, re-use angka kosong).
// - Ditaruh di POOL, di PALING ATAS (biar gak perlu scroll jauh setelah duplicate).
// - visited di-reset ke false (kunjungan baru, beda dari card asli).
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  const source = await prisma.doctor.findUnique({
    where: { id },
    include: { schedules: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Dokter tidak ditemukan" }, { status: 404 });
  }

  // Hitung nama duplikat dari semua nama dokter yang ada
  const all = await prisma.doctor.findMany({ select: { name: true } });
  const allNames = all.map((d) => d.name);
  const newName = nextDuplicateName(allNames, source.name);

  // Posisi: di Pool, PALING ATAS (position terkecil di Pool).
  // Geser semua card Pool yang posisinya >= insertAt, biar ada ruang.
  const minPos = await prisma.doctor.aggregate({
    _min: { position: true },
    where: { scheduledDay: null },
  });
  const insertAt = minPos._min.position ?? 0;

  const doctor = await prisma.$transaction(async (tx) => {
    // Geser card Pool yang posisinya >= insertAt
    await tx.doctor.updateMany({
      where: { scheduledDay: null, position: { gte: insertAt } },
      data: { position: { increment: 1 } },
    });

    return tx.doctor.create({
      data: {
        name: newName,
        outlet: source.outlet,
        scheduledDay: null, // Pool
        position: insertAt,
        flexible: source.flexible,
        priority: source.priority,
        visited: false, // reset — kunjungan baru
        schedules: {
          create: source.schedules.map((s) => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      },
      include: { schedules: true },
    });
  });

  return NextResponse.json({ doctor: toDTO(doctor) }, { status: 201 });
}
