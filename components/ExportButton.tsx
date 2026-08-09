"use client";

import { Download } from "lucide-react";
import type { DoctorDTO } from "@/lib/types";
import { DAY_ORDER, DAY_LABEL } from "@/lib/types";

interface Props {
  doctors: DoctorDTO[];
}

// Export seluruh data dokter (termasuk jadwal & status) ke file .xlsx
export default function ExportButton({ doctors }: Props) {
  async function handleExport() {
    // Dynamic import: xlsx (7MB) hanya di-load saat user klik Export,
    // tidak ikut bundle utama → performa mobile jauh lebih ringan.
    const XLSX = await import("xlsx");

    const rows = doctors.map((d) => {
      const schedText = DAY_ORDER.map((day) => {
        const scheds = d.schedules.filter((s) => s.day === day);
        if (scheds.length === 0) return "";
        const times = scheds.map((s) => `${s.startTime}-${s.endTime}`).join(" & ");
        return `${DAY_LABEL[day].long}: ${times}`;
      })
        .filter(Boolean)
        .join(" | ");

      return {
        "Nama": d.name,
        "Outlet": d.outlet,
        "Jadwal Praktek": schedText,
        "Hari Jadwal": d.scheduledDay ? DAY_LABEL[d.scheduledDay].long : "Pool",
        "Prioritas": d.priority ? "Ya" : "",
        "Sudah Dikunjungi": d.visited ? "Ya" : "",
        "Fleksibel": d.flexible ? "Ya" : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 25 },
      { wch: 60 },
      { wch: 15 },
      { wch: 10 },
      { wch: 18 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RRKM");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `rrkm-dashboard-${dateStr}.xlsx`);
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-emerald-400 hover:text-emerald-300"
      title="Export semua data dokter ke Excel"
    >
      <Download size={15} /> Export
    </button>
  );
}
