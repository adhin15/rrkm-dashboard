import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Board from "@/components/Board";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import type { DayKey } from "@/lib/types";
import { validateSession } from "@/lib/auth";

// Wajib: hindari static generation error saat DB kosong di fase build (Docker)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "RRKM Dashboard — Jadwal Kunjungan Dokter",
  description: "Perencanaan rute kunjungan mingguan dokter (RRKM)",
};

export default async function Home() {
  // Validasi session (token valid & belum expired) — keamanan di level server
  const token = (await cookies()).get("session")?.value;
  const userId = await validateSession(token);
  if (!userId) {
    redirect("/login");
  }

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
    priority: d.priority,
  }));

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              RRKM <span className="text-cyan-400">Dashboard</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Jadwal kunjungan mingguan dokter — drag & drop, validasi otomatis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <Board doctors={doctors} />
      </div>
    </main>
  );
}
