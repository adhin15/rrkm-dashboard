import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Doctor, Schedule } from "@prisma/client";
import { DAY_ORDER, type DayKey, type ScheduleDTO } from "@/lib/types";

// Validasi & normalisasi daftar jadwal
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
    if (sh * 60 + sm >= eh * 60 + em) continue; // end harus > start
    valid.push({ day: day as DayKey, startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`, endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}` });
  }
  return valid;
}

// Tipe hasil query doctor + schedules
type DoctorWithSchedules = Doctor & { schedules: Schedule[] };

// Serialize doctor + schedules ke DoctorDTO
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
  };
}

// ===== GET /api/doctors — ambil semua dokter + schedules =====
export async function GET() {
  const doctors = await prisma.doctor.findMany({
    include: { schedules: true },
    orderBy: [{ scheduledDay: "asc" }, { position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ doctors: doctors.map(toDTO) });
}

// ===== POST /api/doctors — tambah dokter (manual) =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, outlet, schedules, scheduledDay, flexible } = body;

  if (!name || !outlet || !schedules?.length) {
    return NextResponse.json(
      { error: "name, outlet, dan schedules (min 1 jadwal) wajib diisi" },
      { status: 400 }
    );
  }
  const valid = normalizeSchedules(schedules);
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Jadwal tidak valid (butuh day, startTime, endTime; endTime > startTime)" },
      { status: 400 }
    );
  }

  const maxPos = await prisma.doctor.aggregate({
    _max: { position: true },
    where: scheduledDay ? { scheduledDay } : { scheduledDay: null },
  });

  const doctor = await prisma.doctor.create({
    data: {
      name,
      outlet,
      scheduledDay: scheduledDay ?? null,
      position: (maxPos._max.position ?? 0) + 1,
      flexible: flexible === true,
      schedules: { create: valid },
    },
    include: { schedules: true },
  });

  return NextResponse.json({ doctor: toDTO(doctor) }, { status: 201 });
}

// ===== PATCH /api/doctors — update (pindah kolom / edit profil) =====
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, name, outlet, schedules, scheduledDay, position, flexible, visited } = body;

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (outlet !== undefined) data.outlet = outlet;
  if (position !== undefined) data.position = position;
  if (scheduledDay !== undefined) data.scheduledDay = scheduledDay; // null -> Pool
  if (flexible !== undefined) data.flexible = flexible === true;
  if (visited !== undefined) data.visited = visited === true;

  // Jika ada schedules baru, replace seluruh jadwal (transaction)
  if (schedules !== undefined) {
    const valid = normalizeSchedules(schedules);
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "Jadwal tidak valid (butuh day, startTime, endTime; endTime > startTime)" },
        { status: 400 }
      );
    }
    data.schedules = { deleteMany: {}, create: valid };
  }

  const doctor = await prisma.doctor.update({
    where: { id },
    data,
    include: { schedules: true },
  });
  return NextResponse.json({ doctor: toDTO(doctor) });
}

// ===== DELETE /api/doctors?id=xxx — hapus dokter =====
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }
  await prisma.doctor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// ===== PUT /api/doctors — "set data minggu ini": reset semua ke Pool =====
export async function PUT() {
  await prisma.doctor.updateMany({ data: { scheduledDay: null, position: 0 } });
  return NextResponse.json({ ok: true });
}
