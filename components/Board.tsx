"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Kanban, Table as TableIcon, RefreshCcw } from "lucide-react";
import KanbanBoard from "./KanbanBoard";
import TableView from "./TableView";
import DoctorForm from "./DoctorForm";
import ImportExcel from "./ImportExcel";
import type { DoctorDTO, DayKey } from "@/lib/types";

interface Props {
  doctors: DoctorDTO[];
}

export default function Board({ doctors }: Props) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [confirmReset, setConfirmReset] = useState(false);
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // Pindahkan dokter ke kolom/hari tertentu (atau null = Pool)
  async function handleMove(id: string, targetDay: DayKey | null): Promise<boolean> {
    const res = await fetch("/api/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scheduledDay: targetDay }),
    });
    if (res.ok) {
      refresh();
      return true;
    }
    return false;
  }

  async function handleDelete(id: string) {
    if (!confirm(`Hapus dokter ini?`)) return;
    await fetch(`/api/doctors?id=${id}`, { method: "DELETE" });
    refresh();
  }

  async function handleReset() {
    await fetch("/api/doctors", { method: "PUT" });
    setConfirmReset(false);
    refresh();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                view === "kanban"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Kanban size={15} /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                view === "table"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TableIcon size={15} /> Table
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset minggu */}
          {confirmReset ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-950/50 px-3 py-1.5">
              <span className="text-xs text-amber-200">Reset semua jadwal ke Pool?</span>
              <button onClick={handleReset} className="text-xs font-semibold text-amber-300 hover:text-amber-100">
                Ya, reset
              </button>
              <button onClick={() => setConfirmReset(false)} className="text-xs text-amber-400/70 hover:text-amber-200">
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-amber-400 hover:text-amber-300"
            >
              <RefreshCcw size={15} /> Set Minggu Baru
            </button>
          )}
          <ImportExcel onImported={refresh} />
          <DoctorForm onAdded={refresh} />
        </div>
      </div>

      {/* View */}
      {view === "kanban" ? (
        <KanbanBoard doctors={doctors} onMove={handleMove} onDelete={handleDelete} />
      ) : (
        <TableView doctors={doctors} />
      )}
    </div>
  );
}
