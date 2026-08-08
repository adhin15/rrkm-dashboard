import { prisma } from "@/lib/prisma";
import Board from "@/components/Board";
import { DAY_ORDER, type DayKey } from "@/lib/types";

// Wajib: hindari static generation error saat DB kosong di fase build (Docker)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "RRKM Dashboard — Jadwal Kunjungan Dokter",
  description: "Perencanaan rute kunjungan mingguan dokter (RRKM)",
};

function parseDays(raw: string): DayKey[] {
  return raw
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => DAY_ORDER.includes(s as DayKey)) as DayKey[];
}

export default async function Home() {
  const dbDoctors = await prisma.doctor.findMany({
    orderBy: [{ scheduledDay: "asc" }, { position: "asc" }, { name: "asc" }],
  });

  const doctors = dbDoctors.map((d) => ({
    id: d.id,
    name: d.name,
    outlet: d.outlet,
    practiceDays: parseDays(d.practiceDays),
    practiceStart: d.practiceStart,
    practiceEnd: d.practiceEnd,
    scheduledDay: d.scheduledDay as DayKey | null,
    position: d.position,
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
