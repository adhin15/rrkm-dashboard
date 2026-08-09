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
  ok: "text-ink-2",
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
        <div key={day} className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center justify-between border-b border-line bg-card px-4 py-2">
            <h3 className="text-sm font-semibold text-ink">
              {DAY_LABEL[day].long}
            </h3>
            <span className="text-xs text-ink-faint">{cards.length} kunjungan</span>
          </div>
          {cards.length === 0 ? (
            <p className="bg-card/50 px-4 py-3 text-sm text-ink-faintest">
              Tidak ada kunjungan
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-card/50 text-left text-xs uppercase tracking-wide text-ink-faint">
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
                      className="border-b border-line/60 bg-card/30"
                    >
                      <td className="px-4 py-2 text-ink-faint">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-ink">{card.name}</td>
                      <td className="px-4 py-2 text-ink-muted">{card.outlet}</td>
                      <td className="px-4 py-2 text-ink-muted">
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
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex items-center justify-between border-b border-line bg-card px-4 py-2">
          <h3 className="text-sm font-semibold text-ink">Pool (Belum dijadwalkan)</h3>
          <span className="text-xs text-ink-faint">{pool.length} dokter</span>
        </div>
        {pool.length === 0 ? (
          <p className="bg-card/50 px-4 py-3 text-sm text-ink-faintest">
            Semua dokter sudah terjadwal ✓
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 bg-card/30 p-4">
            {pool.map((card) => (
              <span
                key={card.id}
                className="rounded-full border border-line-strong bg-elevated px-3 py-1 text-xs text-ink-2"
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
