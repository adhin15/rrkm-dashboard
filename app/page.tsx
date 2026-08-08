import { prisma } from "@/lib/prisma";
import Board from "@/components/Board";
import type { DayKey } from "@/lib/types";

// Wajib: hindari static generation error saat DB kosong di fase build (Docker)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "RRKM Dashboard — Jadwal Kunjungan Dokter",
  description: "Perencanaan rute kunjungan mingguan dokter (RRKM)",
};

export default async function Home() {
  const dbDoctors = await prisma.doctor.findMany({
    include: { schedules: true },
    orderBy: [{ scheduledDay: "asc" }, { position: "asc" }, { name: "asc" }],
  });

  const doctors = dbDoctors.map((d) => ({
    id: d.id,
    name: d.name,
    outlet: d.outlet,
    schedules: (d.schedules ?? []).map((s) => ({
      day: s.day as DayKey,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    scheduledDay: d.scheduledDay as DayKey | null,
    position: d.position,
    flexible: d.flexible,
    visited: d.visited,
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            RRKM <span className="text-cyan-400">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Jadwal kunjungan mingguan dokter — drag & drop, validasi otomatis
          </p>
        </header>

        <Board doctors={doctors} />
      </div>
    </main>
  );
}
