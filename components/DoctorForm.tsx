"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { DAY_ORDER, DAY_LABEL, type DayKey, type ScheduleDTO } from "@/lib/types";

interface Props {
  onAdded: () => void;
}

// Sesi per hari: day -> array [start, end]
type DaySessions = Partial<Record<DayKey, [string, string][]>>;

const emptySessions: DaySessions = {};

export default function DoctorForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [outlet, setOutlet] = useState("");
  const [sessions, setSessions] = useState<DaySessions>(emptySessions);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(d: DayKey) {
    setSessions((prev) => {
      const next = { ...prev };
      if (next[d]) {
        delete next[d];
      } else {
        next[d] = [["09:00", "11:00"]];
      }
      return next;
    });
  }

  function addSession(d: DayKey) {
    setSessions((prev) => ({
      ...prev,
      [d]: [...(prev[d] || []), ["12:00", "14:00"]],
    }));
  }

  function removeSession(d: DayKey, idx: number) {
    setSessions((prev) => {
      const next = { ...prev };
      const arr = [...(next[d] || [])];
      arr.splice(idx, 1);
      if (arr.length === 0) delete next[d];
      else next[d] = arr;
      return next;
    });
  }

  function setSession(d: DayKey, idx: number, field: 0 | 1, value: string) {
    setSessions((prev) => {
      const next = { ...prev };
      const arr = [...(next[d] || [])];
      arr[idx] = [arr[idx][0], arr[idx][1]];
      arr[idx][field] = value;
      next[d] = arr;
      return next;
    });
  }

  function buildSchedules(): ScheduleDTO[] {
    const out: ScheduleDTO[] = [];
    for (const d of DAY_ORDER) {
      const arr = sessions[d] || [];
      for (const [start, end] of arr) {
        if (start && end) out.push({ day: d, startTime: start, endTime: end });
      }
    }
    return out;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !outlet.trim()) {
      setError("Nama dan outlet wajib diisi");
      return;
    }
    const sched = buildSchedules();
    if (sched.length === 0) {
      setError("Pilih minimal 1 hari praktek dan isi jamnya");
      return;
    }
    // validasi jam
    for (const s of sched) {
      if (s.startTime >= s.endTime) {
        setError(`Jam selesai harus setelah jam mulai (${DAY_LABEL[s.day].long})`);
        return;
      }
    }

    setLoading(true);
    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, outlet, schedules: sched }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menambah dokter");
      return;
    }

    setName("");
    setOutlet("");
    setSessions(emptySessions);
    setOpen(false);
    onAdded();
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-cyan-400 hover:text-cyan-300"
        >
          <Plus size={16} /> Tambah Dokter
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-[520px] max-w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">Tambah Dokter</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-zinc-500 hover:text-zinc-300"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Nama Dokter</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400"
                placeholder="dr. Andi"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Outlet / Klinik</label>
              <input
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400"
                placeholder="Puskesmas Sukamaju"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-zinc-400">Hari & Jam Praktek</label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 p-2">
              {DAY_ORDER.map((d) => {
                const active = sessions[d];
                return (
                  <div key={d} className="rounded-lg bg-zinc-800/40 p-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        {DAY_LABEL[d].long}
                      </button>
                      {active && (
                        <button
                          type="button"
                          onClick={() => addSession(d)}
                          className="ml-auto rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-cyan-400 hover:text-cyan-300"
                        >
                          + sesi
                        </button>
                      )}
                    </div>
                    {active &&
                      active.map((ses, idx) => (
                        <div key={idx} className="mt-1.5 flex items-center gap-1.5 pl-1">
                          <input
                            type="time"
                            value={ses[0]}
                            onChange={(e) => setSession(d, idx, 0, e.target.value)}
                            className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400"
                          />
                          <span className="text-zinc-500">–</span>
                          <input
                            type="time"
                            value={ses[1]}
                            onChange={(e) => setSession(d, idx, 1, e.target.value)}
                            className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeSession(d, idx)}
                            className="ml-auto rounded p-0.5 text-zinc-600 hover:text-red-400"
                            aria-label="Hapus sesi"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-500 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
