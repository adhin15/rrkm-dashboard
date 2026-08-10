"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import type { DoctorDTO } from "@/lib/types";
import type { CardIssue } from "@/lib/collision";
import DoctorCardContent from "./DoctorCardContent";

interface Props {
  card: DoctorDTO;
  issue: CardIssue;
  onDelete: (id: string) => void;
  onToggleFlexible: (id: string) => void;
  onOpenDetail: (card: DoctorDTO) => void;
  onDuplicate: (id: string) => void;
}

// Wrapper sortable tipis. Isi card ada di DoctorCardContent (dipakai juga
// oleh DragOverlay). Saat drag, card asli TIDAK ikut transform (tetap di
// tempat) — overlay yang mengikuti pointer, sehingga drag terasa fluid.
//
// Responsive drag:
//  - Desktop (>=640px): seluruh card draggable (listeners di wrapper).
//  - Mobile (<640px): hanya handle grip yang draggable, agar tidak konflik
//    dengan scroll vertikal kolom (sentuhan di card = scroll, di grip = drag).
export default function DoctorCard({ card, issue, onDelete, onToggleFlexible, onOpenDetail, onDuplicate }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...(!isMobile ? listeners : {})}
    >
      <DoctorCardContent
        card={card}
        issue={issue}
        onDelete={onDelete}
        onToggleFlexible={onToggleFlexible}
        onOpenDetail={onOpenDetail}
        onDuplicate={onDuplicate}
        dragHandleProps={isMobile ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}
