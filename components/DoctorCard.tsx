"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { DoctorDTO, CardState, DayKey } from "@/lib/types";
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
  columnDay: DayKey;
  issue: CardIssue;
  onDelete: (id: string) => void;
}

export default function DoctorCard({ card, columnDay, issue, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const badge = STATE_BADGE[issue.state];

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={issue.message}
      className={`group relative rounded-lg border px-3 py-2.5 shadow-sm transition-colors ${STATE_STYLES[issue.state]} ${
        isDragging ? "z-50 opacity-90 ring-2 ring-cyan-400" : "hover:border-zinc-500"
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle */}
      <button
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-zinc-600 hover:text-zinc-300 active:cursor-grabbing"
        aria-label="Drag"
      >
        <GripVertical size={15} />
      </button>

      <div className="pl-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-zinc-100">{card.name}</p>
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
        <p className="text-xs text-zinc-400">{card.outlet}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
            {card.practiceStart}–{card.practiceEnd}
          </span>
          {badge && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
