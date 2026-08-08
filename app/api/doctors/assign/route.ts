import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DAY_ORDER, type DayKey } from "@/lib/types";

// ===== POST /api/doctors/assign — apply hasil auto-assign massal =====
// Body: { assignments: { [doctorId]: "SENIN" | null } }
// - Set scheduledDay untuk tiap dokter sesuai assignments
// - Reset dokter yang tidak ada di assignments ke Pool (null)
// - Reset position agar urutan per kolom konsisten
export async function POST(request: NextRequest) {
  const body = await request.json();
  const assignments = body?.assignments ?? {};

  if (typeof assignments !== "object" || Array.isArray(assignments)) {
    return NextResponse.json({ error: "assignments harus berupa objek" }, { status: 400 });
  }

  const allDoctors = await prisma.doctor.findMany({ select: { id: true } });
  const validDay = (d: string): d is DayKey => DAY_ORDER.includes(d as DayKey);

  // Transaction: update semua dokter
  await prisma.$transaction(
    allDoctors.map((doc) => {
      const target = assignments[doc.id];
      const scheduledDay = target === null ? null : validDay(target) ? target : null;
      return prisma.doctor.update({
        where: { id: doc.id },
        data: { scheduledDay, position: 0 },
      });
    })
  );

  // Reset position per kolom agar urutan rapi
  for (const day of DAY_ORDER) {
    const rows = await prisma.doctor.findMany({
      where: { scheduledDay: day },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    await prisma.$transaction(
      rows.map((r, i) =>
        prisma.doctor.update({ where: { id: r.id }, data: { position: i + 1 } })
      )
    );
  }

  return NextResponse.json({ ok: true });
}
