import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DAY_ORDER, type DayKey } from "@/lib/types";

// Validasi & normalisasi hari praktek (CSV -> array DayKey)
function parseDays(raw: string): DayKey[] {
  return raw
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => DAY_ORDER.includes(s as DayKey)) as DayKey[];
}

// ===== GET /api/doctors — ambil semua dokter, urutkan per kolom =====
export async function GET() {
  const doctors = await prisma.doctor.findMany({
    orderBy: [{ scheduledDay: "asc" }, { position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      outlet: d.outlet,
      practiceDays: parseDays(d.practiceDays),
      practiceStart: d.practiceStart,
      practiceEnd: d.practiceEnd,
      scheduledDay: d.scheduledDay as DayKey | null,
      position: d.position,
    })),
  });
}

// ===== POST /api/doctors — tambah dokter (manual) =====
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, outlet, practiceDays, practiceStart, practiceEnd, scheduledDay } = body;

  if (!name || !outlet || !practiceDays?.length || !practiceStart || !practiceEnd) {
    return NextResponse.json(
      { error: "name, outlet, practiceDays, practiceStart, practiceEnd wajib diisi" },
      { status: 400 }
    );
  }

  const days = parseDays(practiceDays.join(","));
  if (days.length === 0) {
    return NextResponse.json(
      { error: "practiceDays tidak valid (gunakan SENIN-SABTU)" },
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
      practiceDays: days.join(","),
      practiceStart,
      practiceEnd,
      scheduledDay: scheduledDay ?? null,
      position: (maxPos._max.position ?? 0) + 1,
    },
  });

  return NextResponse.json({ doctor }, { status: 201 });
}

// ===== PATCH /api/doctors — update (pindah kolom saat drag-drop) =====
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, name, outlet, practiceDays, practiceStart, practiceEnd, scheduledDay, position } = body;

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (outlet !== undefined) data.outlet = outlet;
  if (practiceStart !== undefined) data.practiceStart = practiceStart;
  if (practiceEnd !== undefined) data.practiceEnd = practiceEnd;
  if (position !== undefined) data.position = position;
  if (scheduledDay !== undefined) data.scheduledDay = scheduledDay; // null -> Pool
  if (practiceDays !== undefined) data.practiceDays = parseDays(practiceDays.join(",")).join(",");

  const doctor = await prisma.doctor.update({ where: { id }, data });
  return NextResponse.json({ doctor });
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
  await prisma.doctor.updateMany({
    data: { scheduledDay: null, position: 0 },
  });
  return NextResponse.json({ ok: true });
}
