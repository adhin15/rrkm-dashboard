"use client";

import { Trash2, Clock, Check, GripVertical } from "lucide-react";
import type { DoctorDTO, CardState } from "@/lib/types";
import { practiceDaysOf, DAY_LABEL } from "@/lib/types";
import type { CardIssue } from "@/lib/collision";

// Map state -> kelas warna card
const STATE_STYLES: Record<CardState, string> = {
  "invalid-day": "border-red-500 bg-red-500/10",
  "collision-different-outlet": "border-pink-400 bg-pink-400/10",
  "collision-same-outlet": "border-emerald-400 bg-emerald-400/10",
  ok: "border-zinc-700 bg-zinc-800/60",
};

const STATE_BADGE: Record<CardState, { label: string; cls: string } | null> = {
  "invalid-day": { label: "Hari salah", cls: "bg-red-500/20 text-red-300" },
  "collision-different-outlet": { label: "Tabrakan", cls: "bg-pink-500/20 text-pink-300" },
  "collision-same-outlet": { label: "Outlet sama", cls: "bg-emerald-500/20 text-emerald-300" },
  ok: null,
};

interface Props {
  card: DoctorDTO;
  issue: CardIssue;
  onDelete: (id: string) => void;
  onToggleFlexible: (id: string) => void;
  onOpenDetail: (card: DoctorDTO) => void;
  // Saat dipakai sebagai DragOverlay: non-interaktif, tanpa cursor grab
  overlay?: boolean;
  // Mobile: listeners drag dipasang di handle grip saja.
  dragHandleProps?: Record<string, unknown>;
}

// Isi card murni (tanpa useSortable) — dipakai oleh DoctorCard (sortable)
// dan DragOverlay (saat drag). Memastikan tampilan overlay identik dgn card.
export default function DoctorCardContent({
  card,
  issue,
  onDelete,
  onToggleFlexible,
  onOpenDetail,
  overlay,
  dragHandleProps,
}: Props) {
  const badge = STATE_BADGE[issue.state];
  const days = practiceDaysOf(card);

  return (
    <div
      title={issue.message}
      onClick={overlay ? undefined : () => onOpenDetail(card)}
      className={`group relative rounded-lg border px-3 py-2.5 shadow-sm ${STATE_STYLES[issue.state]} ${
        overlay ? "cursor-grabbing ring-2 ring-cyan-400" : "transition-colors hover:border-zinc-500"
      } ${card.visited ? "opacity-80" : ""} ${dragHandleProps ? "pl-12" : ""}`}
    >
      {/* Handle grip (mobile): hanya area ini yang draggable */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute left-1.5 top-1/2 flex h-11 w-9 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 shadow-sm active:cursor-grabbing active:border-cyan-400"
          title="Tahan untuk drag"
          aria-label="Drag"
        >
          <GripVertical size={20} />
        </div>
      )}
      {/* Corner hijau untuk visited */}
      {card.visited && (
        <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl-lg border-b border-l border-zinc-800 bg-emerald-400 text-zinc-950">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-medium ${
            card.priority
              ? "text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]"
              : "text-zinc-100"
          }`}
        >
          {card.name}
        </p>
        {!overlay && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFlexible(card.id);
              }}
              className={`rounded p-0.5 transition-colors group-hover:opacity-100 ${
                card.flexible
                  ? "text-amber-300 opacity-100"
                  : "text-zinc-600 opacity-0 hover:text-amber-300"
              }`}
              title={card.flexible ? "Jadwal fleksibel (klik untuk matikan)" : "Tandai jadwal fleksibel"}
              aria-label={card.flexible ? "Jadwal fleksibel" : "Tandai fleksibel"}
            >
              <Clock size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
              aria-label="Hapus"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400">{card.outlet}</p>

      {/* Badge fleksibel */}
      {card.flexible && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
          <Clock size={10} /> Fleksibel
        </span>
      )}

      {/* Jadwal per hari: <Sen 09:00-13:00> <Sel 09:00-14:00> ... */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {days.map((d) => {
          const scheds = card.schedules.filter((s) => s.day === d);
          return (
            <span
              key={d}
              className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300"
              title={scheds.map((s) => `${s.startTime}-${s.endTime}`).join(" & ")}
            >
              {DAY_LABEL[d].short}
              {scheds.map((s) => ` ${s.startTime}-${s.endTime}`).join("")}
            </span>
          );
        })}
      </div>

      {badge && (
        <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      )}
    </div>
  );
}
