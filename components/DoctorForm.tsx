"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { DAY_ORDER, DAY_LABEL, type DayKey } from "@/lib/types";

interface Props {
  onAdded: () => void;
}

const initialForm = {
  name: "",
  outlet: "",
  practiceStart: "09:00",
  practiceEnd: "11:00",
};

export default function DoctorForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [days, setDays] = useState<DayKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(d: DayKey) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.outlet.trim()) {
      setError("Nama dan outlet wajib diisi");
      return;
    }
    if (days.length === 0) {
      setError("Pilih minimal 1 hari praktek");
      return;
    }
    if (form.practiceStart >= form.practiceEnd) {
      setError("Jam mulai harus sebelum jam selesai");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, practiceDays: days }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menambah dokter");
      return;
    }

    setForm(initialForm);
    setDays([]);
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
          className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-lg"
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400"
                placeholder="dr. Andi"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Outlet / Klinik</label>
              <input
                value={form.outlet}
                onChange={(e) => setForm({ ...form, outlet: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400"
                placeholder="Puskesmas Sukamaju"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Jam Mulai</label>
              <input
                type="time"
                value={form.practiceStart}
                onChange={(e) => setForm({ ...form, practiceStart: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Jam Selesai</label>
              <input
                type="time"
                value={form.practiceEnd}
                onChange={(e) => setForm({ ...form, practiceEnd: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-zinc-400">Hari Praktek</label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    days.includes(d)
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {DAY_LABEL[d].long}
                </button>
              ))}
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
