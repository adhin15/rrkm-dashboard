"use client";

import { useState, useSyncExternalStore } from "react";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
} from "@dnd-kit/sortable";
import KanbanColumn from "./KanbanColumn";
import DoctorCardContent from "./DoctorCardContent";
import { DAY_ORDER, type DayKey, type DoctorDTO } from "@/lib/types";
import { isPracticingOn } from "@/lib/collision";
import { passesFilter, sortDoctors, type SortOption } from "@/lib/filters";

// Kolom: 6 hari + 1 Pool (diwakili string "POOL")
const POOL = "POOL" as const;
type ColumnId = DayKey | typeof POOL;

interface Props {
  doctors: DoctorDTO[];
  onMove: (id: string, targetDay: DayKey | null) => Promise<boolean>;
  onDelete: (id: string) => void;
  onToggleFlexible: (id: string) => void;
  onOpenDetail: (card: DoctorDTO) => void;
  filterDays: DayKey[];
  filterStart: string;
  filterEnd: string;
  filterOutlet: string;
  sortBy: SortOption;
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

export default function KanbanBoard({
  doctors,
  onMove,
  onDelete,
  onToggleFlexible,
  onOpenDetail,
  filterDays,
  filterStart,
  filterEnd,
  filterOutlet,
  sortBy,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // dnd-kit (DndContext/useSortable) punya ID internal yang berbeda antara
  // render server vs client → hydration mismatch yang merusak drag.
  // Solusi: render board hanya setelah mount di client (via useSyncExternalStore).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const sensors = useSensors(
    // distance kecil = drag aktif lebih cepat (kurangi delay terasa)
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    // Mobile: handle grip sudah jadi target drag yang disengaja,
    // jadi tidak perlu long-press delay — drag langsung aktif.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 0, tolerance: 8 },
    })
  );

  const filteredDoctors = doctors.filter((d) =>
    passesFilter(d, filterDays, filterStart, filterEnd, filterOutlet)
  );
  const groups = groupByColumn(filteredDoctors);

  // Sort setiap kolom (kecuali Pool — biarkan urutan drag)
  const sortedGroups = { ...groups };
  for (const day of DAY_ORDER) {
    sortedGroups[day] = sortDoctors(groups[day], sortBy);
  }
  sortedGroups.POOL = groups.POOL;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
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

      {!mounted ? (
        // Placeholder statis sampai mount — mencegah hydration mismatch dnd-kit
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[null, ...DAY_ORDER].map((_, i) => (
            <div key={i} className="min-w-[240px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="h-3 w-16 rounded bg-zinc-800" />
              <div className="mt-3 h-16 rounded-lg bg-zinc-800/60" />
              <div className="mt-2 h-16 rounded-lg bg-zinc-800/60" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start gap-3 overflow-x-auto pb-4 sm:snap-none">
            {/* Kolom Pool dulu */}
            <KanbanColumn day="POOL" cards={sortedGroups.POOL} isPool onDelete={onDelete} onToggleFlexible={onToggleFlexible} onOpenDetail={onOpenDetail} />

            {/* Kolom hari */}
            {DAY_ORDER.map((day) => (
              <KanbanColumn key={day} day={day} cards={sortedGroups[day]} onDelete={onDelete} onToggleFlexible={onToggleFlexible} onOpenDetail={onOpenDetail} />
            ))}
          </div>

          {/* Overlay yang mengikuti pointer saat drag — card asli tetap di tempat */}
          <DragOverlay>
            {activeId ? (
              <DoctorCardContent
                card={doctors.find((d) => d.id === activeId)!}
                issue={{ state: "ok", message: "" }}
                onDelete={onDelete}
                onToggleFlexible={onToggleFlexible}
                onOpenDetail={() => {}}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
