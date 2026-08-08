"use client";

import { useState } from "react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import KanbanColumn from "./KanbanColumn";
import { DAY_ORDER, type DayKey, type DoctorDTO } from "@/lib/types";
import { isPracticingOn } from "@/lib/collision";

// Kolom: 6 hari + 1 Pool (diwakili string "POOL")
const POOL = "POOL" as const;
type ColumnId = DayKey | typeof POOL;

interface Props {
  doctors: DoctorDTO[];
  onMove: (id: string, targetDay: DayKey | null) => Promise<boolean>;
  onDelete: (id: string) => void;
}

// Kelompokkan dokter per kolom
function groupByColumn(doctors: DoctorDTO[]) {
  const groups: Record<ColumnId, DoctorDTO[]> = {
    SENIN: [],
    SELASA: [],
    RABU: [],
    KAMIS: [],
    JUMAT: [],
    SABTU: [],
    POOL: [],
  };
  for (const d of doctors) {
    const key: ColumnId = d.scheduledDay ?? POOL;
    groups[key].push(d);
  }
  return groups;
}

export default function KanbanBoard({ doctors, onMove, onDelete }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const groups = groupByColumn(doctors);
  const allIds = doctors.map((d) => d.id);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const card = doctors.find((d) => d.id === active.id);
    if (!card) return;

    const fromId = (card.scheduledDay ?? POOL) as ColumnId;
    const toId = over.id as ColumnId;

    // Dropped di card lain → kolom tujuan = kolom card tsb
    let targetColumn: ColumnId = toId;
    if (toId !== POOL && !DAY_ORDER.includes(toId as DayKey)) {
      const overCard = doctors.find((d) => d.id === toId);
      if (overCard) targetColumn = (overCard.scheduledDay ?? POOL) as ColumnId;
    }

    // Pindah ke kolom yang sama → hanya reorder
    if (fromId === targetColumn) {
      const oldIndex = groups[fromId].findIndex((d) => d.id === active.id);
      const newIndex = groups[targetColumn].findIndex((d) => d.id === over.id);
      if (oldIndex !== newIndex) {
        const moved = arrayMove(groups[fromId], oldIndex, newIndex);
        // update posisi (reorder dalam kolom)
        await Promise.all(
          moved.map((d, i) =>
            fetch("/api/doctors", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: d.id, position: i + 1 }),
            })
          )
        );
        window.location.reload();
      }
      return;
    }

    // Pindah antar kolom → validasi hari praktek
    if (targetColumn !== POOL) {
      if (!isPracticingOn(card, targetColumn as DayKey)) {
        showToast(
          `Ditolak: ${card.name} tidak praktek di hari ${(targetColumn as DayKey).toLowerCase()}`
        );
        return; // jangan pindah
      }
    }

    const ok = await onMove(
      card.id,
      targetColumn === POOL ? null : (targetColumn as DayKey)
    );
    if (!ok) {
      showToast(`Gagal memindahkan ${card.name}`);
    }
  }

  return (
    <div className="relative">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-lg border border-red-500 bg-red-950/90 px-4 py-2.5 text-sm text-red-100 shadow-xl">
          {toast}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allIds}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {/* Kolom Pool dulu */}
            <KanbanColumn day="POOL" cards={groups.POOL} isPool onDelete={onDelete} />

            {/* Kolom hari */}
            {DAY_ORDER.map((day) => (
              <KanbanColumn key={day} day={day} cards={groups[day]} onDelete={onDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
