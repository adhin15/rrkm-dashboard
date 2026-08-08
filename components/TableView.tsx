"use client";

import { DAY_ORDER, DAY_LABEL, type DoctorDTO } from "@/lib/types";
import { getCardState } from "@/lib/collision";

interface Props {
  doctors: DoctorDTO[];
}

// Warna text untuk state di tabel
const STATE_TEXT: Record<string, string> = {
  "invalid-day": "text-red-400",
  "collision-different-outlet": "text-pink-400",
  "collision-same-outlet": "text-emerald-400",
  ok: "text-zinc-200",
};

export default function TableView({ doctors }: Props) {
  // Kelompokkan per hari (urutan hari), termasuk Pool di akhir
  const byDay = DAY_ORDER.map((day) => {
    const cards = doctors
      .filter((d) => d.scheduledDay === day)
      .sort((a, b) => a.position - b.position);
    return { day, cards };
  });
  const pool = doctors
    .filter((d) => d.scheduledDay === null)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* Table per hari */}
      {byDay.map(({ day, cards }) => (
        <div key={day} className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              {DAY_LABEL[day].long}
            </h3>
            <span className="text-xs text-zinc-500">{cards.length} kunjungan</span>
          </div>
          {cards.length === 0 ? (
            <p className="bg-zinc-900/50 px-4 py-3 text-sm text-zinc-600">
              Tidak ada kunjungan
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Dokter</th>
                  <th className="px-4 py-2">Outlet</th>
                  <th className="px-4 py-2">Jam Praktek</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card, i) => {
                  const issue = getCardState(card, day, cards);
                  return (
                    <tr
                      key={card.id}
                      className="border-b border-zinc-800/60 bg-zinc-900/30"
                    >
                      <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-zinc-100">{card.name}</td>
                      <td className="px-4 py-2 text-zinc-400">{card.outlet}</td>
                      <td className="px-4 py-2 text-zinc-400">
                        {card.schedules
                          .filter((s) => s.day === day)
                          .map((s) => `${s.startTime}–${s.endTime}`)
                          .join(", ")}
                      </td>
                      <td className={`px-4 py-2 ${STATE_TEXT[issue.state]}`}>
                        {issue.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Pool */}
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
          <h3 className="text-sm font-semibold text-zinc-100">Pool (Belum dijadwalkan)</h3>
          <span className="text-xs text-zinc-500">{pool.length} dokter</span>
        </div>
        {pool.length === 0 ? (
          <p className="bg-zinc-900/50 px-4 py-3 text-sm text-zinc-600">
            Semua dokter sudah terjadwal ✓
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 bg-zinc-900/30 p-4">
            {pool.map((card) => (
              <span
                key={card.id}
                className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
              >
                {card.name} · {card.outlet}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
