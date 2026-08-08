"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DoctorCard from "./DoctorCard";
import type { DoctorDTO, DayKey } from "@/lib/types";
import { DAY_LABEL } from "@/lib/types";
import { SATURDAY_END, MIN_DOCTORS_PER_DAY } from "@/lib/types";
import { getCardState } from "@/lib/collision";

interface Props {
  day: DayKey | "POOL";
  cards: DoctorDTO[];
  isPool?: boolean;
  onDelete: (id: string) => void;
  onToggleFlexible: (id: string) => void;
  onOpenDetail: (card: DoctorDTO) => void;
}

export default function KanbanColumn({ day, cards, isPool, onDelete, onToggleFlexible, onOpenDetail }: Props) {
  // Droppable id: "POOL" untuk kolom pool, selain itu day key
  const droppableId = isPool ? "POOL" : (day as DayKey);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const label = isPool
    ? { short: "Pool", long: "Pool (Belum dijadwalkan)" }
    : DAY_LABEL[day as DayKey];

  // Badge count target (non-pool)
  const count = cards.length;
  const metTarget = count >= MIN_DOCTORS_PER_DAY;
  const underTarget = !isPool && count < MIN_DOCTORS_PER_DAY;

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[240px] flex-1 flex-col rounded-xl border bg-zinc-900/50 ${
        isOver ? "border-cyan-400 ring-2 ring-cyan-400/30" : "border-zinc-800"
      }`}
    >
      {/* Header kolom */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{label.short}</h3>
          {!isPool && (
            <p className="text-[10px] text-zinc-500">
              {day === "SABTU" ? `Half-day s/d ${SATURDAY_END}` : "Full day"}
            </p>
          )}
        </div>
        {!isPool && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              metTarget
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
            title={underTarget ? `Kurang dari target ${MIN_DOCTORS_PER_DAY}/hari` : "Target tercapai"}
          >
            {count}/{MIN_DOCTORS_PER_DAY}
          </span>
        )}
        {isPool && (
          <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
            {count}
          </span>
        )}
      </div>

      {/* List card */}
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {cards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">
              {isPool ? "Drag card ke sini / tambah" : "Kosong"}
            </div>
          ) : (
            cards.map((card) => (
              <DoctorCard
                key={card.id}
                card={card}
                issue={
                  isPool
                    ? { state: "ok", message: "Belum dijadwalkan" }
                    : getCardState(card, day as DayKey, cards)
                }
                onDelete={onDelete}
                onToggleFlexible={onToggleFlexible}
                onOpenDetail={onOpenDetail}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
