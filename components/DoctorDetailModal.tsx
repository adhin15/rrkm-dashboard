"use client";

import { X, CheckCircle2, Circle, Clock, Star, Trash2 } from "lucide-react";
import type { DoctorDTO, DayKey } from "@/lib/types";
import { DAY_ORDER, DAY_LABEL } from "@/lib/types";

interface Props {
  card: DoctorDTO;
  onClose: () => void;
  onMove: (id: string, day: DayKey | null) => void;
  onToggleFlexible: (id: string) => void;
  onToggleVisited: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DoctorDetailModal({
  card,
  onClose,
  onMove,
  onToggleFlexible,
  onToggleVisited,
  onTogglePriority,
  onDelete,
}: Props) {
  const currentDay = card.scheduledDay;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line-strong bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line bg-card px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{card.name}</h2>
            <p className="text-sm text-ink-muted">{card.outlet}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-ink-faint hover:text-ink-2"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
          {/* Jadwal per hari */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Jadwal Praktek
            </h3>
            <div className="space-y-1.5">
              {DAY_ORDER.map((d) => {
                const scheds = card.schedules.filter((s) => s.day === d);
                if (scheds.length === 0) return null;
                return (
                  <div key={d} className="flex items-center gap-2 text-sm">
                    <span className="w-16 shrink-0 font-medium text-cyan-300">
                      {DAY_LABEL[d].long}
                    </span>
                    <span className="text-ink-2">
                      {scheds.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
                    </span>
                  </div>
                );
              })}
              {card.flexible && (
                <div className="flex items-center gap-2 text-sm text-amber-300">
                  <span className="w-16 shrink-0 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> Jadwal fleksibel
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pindahkan ke hari */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Pindahkan ke Hari
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onMove(card.id, null)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  currentDay === null
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                    : "border-line-strong bg-elevated text-ink-muted hover:border-line-strong"
                }`}
              >
                Pool
              </button>
              {DAY_ORDER.map((d) => {
                const disabled = !card.schedules.some((s) => s.day === d);
                return (
                  <button
                    key={d}
                    disabled={disabled}
                    onClick={() => onMove(card.id, d)}
                    title={disabled ? "Tidak praktek di hari ini" : ""}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      currentDay === d
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : disabled
                        ? "cursor-not-allowed border-line bg-card text-ink-faintest"
                        : "border-line-strong bg-elevated text-ink-muted hover:border-line-strong"
                    }`}
                  >
                    {DAY_LABEL[d].short}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faintest">
              Hari yang tidak praktek dinonaktifkan.
            </p>
          </div>

          {/* Status toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTogglePriority(card.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                card.priority
                  ? "border-sky-400 bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                  : "border-line-strong bg-elevated text-ink-2 hover:border-sky-400"
              }`}
            >
              <Star size={16} fill={card.priority ? "currentColor" : "none"} />
              {card.priority ? "Prioritas" : "Tandai prioritas"}
            </button>
            <button
              onClick={() => onToggleVisited(card.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                card.visited
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : "border-line-strong bg-elevated text-ink-2 hover:border-emerald-400"
              }`}
            >
              {card.visited ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {card.visited ? "Sudah dikunjungi" : "Tandai sudah dikunjungi"}
            </button>
            <button
              onClick={() => onToggleFlexible(card.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                card.flexible
                  ? "border-amber-400 bg-amber-500/20 text-amber-300"
                  : "border-line-strong bg-elevated text-ink-2 hover:border-amber-400"
              }`}
            >
              <Clock size={16} />
              {card.flexible ? "Jadwal fleksibel" : "Tandai fleksibel"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-card px-5 py-3">
          <button
            onClick={() => onDelete(card.id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-faint transition-colors hover:text-red-400"
          >
            <Trash2 size={15} /> Hapus
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-elevated px-4 py-1.5 text-sm text-ink-2 hover:bg-elevated-strong"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
