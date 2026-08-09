"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Kanban, Table as TableIcon, RefreshCcw, ListFilter, Wand2, Trash2 } from "lucide-react";
import KanbanBoard from "./KanbanBoard";
import TableView from "./TableView";
import DoctorForm from "./DoctorForm";
import ImportExcel from "./ImportExcel";
import ExportButton from "./ExportButton";
import DoctorDetailModal from "./DoctorDetailModal";
import type { DoctorDTO, DayKey } from "@/lib/types";
import { DAY_ORDER, DAY_LABEL } from "@/lib/types";
import { SORT_LABELS, type SortOption } from "@/lib/filters";
import { autoAssign } from "@/lib/autoschedule";

interface Props {
  doctors: DoctorDTO[];
}

export default function Board({ doctors }: Props) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [confirmReset, setConfirmReset] = useState(false);
  const [filterDays, setFilterDays] = useState<DayKey[]>([]);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterOutlet, setFilterOutlet] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("position");
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [confirmFlush, setConfirmFlush] = useState(false);
  const router = useRouter();

  // Derive popup card dari data terbaru setiap render — jadi setiap refresh,
  // popup otomatis menampilkan data terbaru tanpa perlu effect / tutup popup.
  const detailCard = detailCardId
    ? doctors.find((d) => d.id === detailCardId) ?? null
    : null;

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

  async function handleToggleFlexible(id: string) {
    const doctor = doctors.find((d) => d.id === id);
    if (!doctor) return;
    await fetch("/api/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, flexible: !doctor.flexible }),
    });
    refresh();
  }

  async function handleToggleVisited(id: string) {
    const doctor = doctors.find((d) => d.id === id);
    if (!doctor) return;
    await fetch("/api/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visited: !doctor.visited }),
    });
    refresh(); // popup tidak ditutup; data terbaru auto-render
  }

  async function handleTogglePriority(id: string) {
    const doctor = doctors.find((d) => d.id === id);
    if (!doctor) return;
    await fetch("/api/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, priority: !doctor.priority }),
    });
    refresh();
  }

  async function handleMoveFromModal(id: string, targetDay: DayKey | null) {
    // Pindah hari dari popup — popup tetap terbuka, data di-refresh via useEffect.
    // Validasi hari praktek dilakukan di KanbanBoard.handleDragEnd; di sini
    // panggil handleMove langsung. Hari yang tidak praktek sudah dinonaktifkan
    // di UI popup, jadi tidak perlu blok tambahan.
    await handleMove(id, targetDay);
  }

  async function handleDeleteFromModal(id: string) {
    if (!confirm(`Hapus dokter ini?`)) return;
    await fetch(`/api/doctors?id=${id}`, { method: "DELETE" });
    setDetailCardId(null);
    refresh();
  }

  async function handleReset() {
    await fetch("/api/doctors", { method: "PUT" });
    setConfirmReset(false);
    refresh();
  }

  async function handleFlush() {
    // Konfirmasi ganda: state confirmFlush harus sudah true (langkah ke-2)
    setConfirmFlush(false);
    const res = await fetch("/api/doctors/flush", { method: "POST" });
    if (res.ok) {
      refresh();
      setAssignMsg("🗑 Semua data dokter telah dihapus. Silakan import data minggu baru.");
      setTimeout(() => setAssignMsg(null), 5000);
    } else {
      setAssignMsg("❌ Gagal menghapus data.");
      setTimeout(() => setAssignMsg(null), 5000);
    }
  }

  async function handleAutoAssign() {
    setAssignMsg(null);
    setConfirmAssign(false);
    try {
      // Hanya assign dokter yang masih di Pool
      const poolDoctors = doctors.filter((d) => d.scheduledDay === null);
      if (poolDoctors.length === 0) {
        setAssignMsg("Tidak ada dokter di Pool untuk di-assign.");
        setTimeout(() => setAssignMsg(null), 3500);
        return;
      }
      const result = autoAssign(doctors);
      const assignedCount = Object.keys(result).length;
      const skipped = poolDoctors.length - assignedCount;

      const res = await fetch("/api/doctors/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: result }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan jadwal");

      refresh();
      setAssignMsg(
        `✅ Auto-assign selesai: ${assignedCount} dokter dijadwalkan${skipped ? `, ${skipped} di-skip (tidak muat)` : ""}.`
      );
      setTimeout(() => setAssignMsg(null), 5000);
    } catch (e) {
      setAssignMsg(`❌ Gagal auto-assign: ${(e as Error).message}`);
      setTimeout(() => setAssignMsg(null), 5000);
    }
  }

  function toggleDay(d: DayKey) {
    setFilterDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  const hasFilter = filterDays.length > 0 || !!filterStart || !!filterEnd || !!filterOutlet;

  function clearFilters() {
    setFilterDays([]);
    setFilterStart("");
    setFilterEnd("");
    setFilterOutlet("");
  }

  // Daftar outlet unik (untuk dropdown filter rumah sakit)
  const outlets = Array.from(new Set(doctors.map((d) => d.outlet))).sort((a, b) =>
    a.localeCompare(b)
  );

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Assign */}
          {confirmAssign ? (
            <div className="flex items-center gap-2 rounded-lg border border-cyan-500 bg-cyan-950/50 px-3 py-1.5">
              <span className="text-xs text-cyan-200">Auto-assign semua dokter di Pool?</span>
              <button onClick={handleAutoAssign} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100">
                Ya, assign
              </button>
              <button onClick={() => setConfirmAssign(false)} className="text-xs text-cyan-400/70 hover:text-cyan-200">
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAssign(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-700 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-400 hover:bg-cyan-500/20"
              title="Susun jadwal otomatis: klaster outlet, dahulukan prioritas"
            >
              <Wand2 size={15} /> Auto Assign
            </button>
          )}
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
          {/* Flush semua data */}
          {confirmFlush ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500 bg-red-950/50 px-3 py-1.5">
              <span className="text-xs text-red-200">Hapus SEMUA data dokter? (tidak bisa dibatalkan)</span>
              <button onClick={handleFlush} className="text-xs font-semibold text-red-300 hover:text-red-100">
                Ya, hapus semua
              </button>
              <button onClick={() => setConfirmFlush(false)} className="text-xs text-red-400/70 hover:text-red-200">
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmFlush(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500 hover:text-red-300"
              title="Hapus semua data dokter & jadwal. Untuk ganti minggu & import daftar baru dari nol."
            >
              <Trash2 size={15} /> Hapus Semua
            </button>
          )}
          <ExportButton doctors={doctors} />
          <DoctorForm onAdded={refresh} />
          <ImportExcel onImported={refresh} />
        </div>
      </div>

      {/* Pesan auto-assign */}
      {assignMsg && (
        <div className="mb-3 rounded-lg border border-cyan-700 bg-cyan-950/50 px-4 py-2 text-sm text-cyan-100">
          {assignMsg}
        </div>
      )}

      {/* Toolbar Filter & Sort */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center gap-1.5">
          <ListFilter size={15} className="text-cyan-400" />
          <span className="text-xs font-medium text-zinc-300">Filter</span>
        </div>

        {/* Filter hari */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-zinc-500">Hari:</span>
          {DAY_ORDER.map((d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                filterDays.includes(d)
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {DAY_LABEL[d].short}
            </button>
          ))}
        </div>

        {/* Filter range jam */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">Jam:</span>
          <input
            type="time"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="time"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400"
          />
        </div>

        {/* Filter rumah sakit */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">RS:</span>
          <select
            value={filterOutlet}
            onChange={(e) => setFilterOutlet(e.target.value)}
            className="max-w-[180px] rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400"
          >
            <option value="">Semua RS</option>
            {outlets.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {hasFilter && (
          <button
            onClick={clearFilters}
            className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:border-red-400 hover:text-red-300"
          >
            Bersihkan
          </button>
        )}

        {/* Sorting */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">Urutkan:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-400"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <option key={opt} value={opt}>{SORT_LABELS[opt]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View */}
      {view === "kanban" ? (
        <KanbanBoard doctors={doctors} onMove={handleMove} onDelete={handleDelete} onToggleFlexible={handleToggleFlexible} onOpenDetail={(c) => setDetailCardId(c.id)} filterDays={filterDays} filterStart={filterStart} filterEnd={filterEnd} filterOutlet={filterOutlet} sortBy={sortBy} />
      ) : (
        <TableView doctors={doctors} />
      )}

      {/* Popup detail */}
      {detailCard && (
        <DoctorDetailModal
          card={detailCard}
          onClose={() => setDetailCardId(null)}
          onMove={handleMoveFromModal}
          onToggleFlexible={handleToggleFlexible}
          onToggleVisited={handleToggleVisited}
          onTogglePriority={handleTogglePriority}
          onDelete={handleDeleteFromModal}
        />
      )}
    </div>
  );
}
