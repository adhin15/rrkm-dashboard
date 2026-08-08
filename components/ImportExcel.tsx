"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import type { DayKey } from "@/lib/types";

interface Props {
  onImported: () => void;
}

// Map hari (multi bahasa) -> DayKey
const DAY_ALIAS: Record<DayKey, string[]> = {
  SENIN: ["SENIN", "MON", "MONDAY"],
  SELASA: ["SELASA", "TUE", "TUESDAY"],
  RABU: ["RABU", "WED", "WEDNESDAY"],
  KAMIS: ["KAMIS", "THU", "THURSDAY"],
  JUMAT: ["JUMAT", "FRI", "FRIDAY"],
  SABTU: ["SABTU", "SAT", "SATURDAY"],
};

function parseDay(s: string): DayKey | null {
  const up = s.trim().toUpperCase();
  for (const [code, aliases] of Object.entries(DAY_ALIAS)) {
    if (aliases.includes(up)) return code as DayKey;
  }
  return null;
}

function parseTime(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (m) return `${Number(m[1]).toString().padStart(2, "0")}:${m[2]}`;
  return null;
}

// Parse sel text jadwal: "Senin : 09.00 - 13.00 dan 16.00 - 17.00"
// atau format flat "09.00" / "13.00" per kolom. Mengembalikan array schedule.
function parseScheduleText(raw: string): { day: DayKey; startTime: string; endTime: string }[] {
  const out: { day: DayKey; startTime: string; endTime: string }[] = [];
  const parts = raw.split(/[;,|]/).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const day = parseDay(m[1]);
    if (!day) continue;
    const rest = m[2];
    // sesi dipisah "dan"
    for (const sess of rest.split(/\s+dan\s+/)) {
      const tm = sess.match(/^\s*(\d{1,2}[.:]\d{2})\s*[-–]\s*(\d{1,2}[.:]\d{2}|selesai|sampai)\s*$/i);
      if (!tm) continue;
      const start = parseTime(tm[1]);
      let end = parseTime(tm[2]);
      if (!end && /selesai|sampai/i.test(tm[2])) {
        // asumsi "selesai" = +2 jam dari start
        const [h, mnt] = start!.split(":").map(Number);
        end = `${String(((h * 60 + mnt + 120) / 60) | 0).padStart(2, "0")}:${String(((h * 60 + mnt + 120) % 60)).padStart(2, "0")}`;
      }
      if (start && end) out.push({ day, startTime: start, endTime: end });
    }
  }
  return out;
}

export default function ImportExcel({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState({ name: "", outlet: "", schedule: "" });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (data.length === 0) {
          setMsg({ type: "err", text: "File kosong atau tidak ada data." });
          return;
        }
        setHeaders(Object.keys(data[0]));
        setRows(data);
        guessMapping(Object.keys(data[0]));
      } catch {
        setMsg({ type: "err", text: "Gagal membaca file. Pastikan formatnya .xlsx / .csv." });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function guessMapping(hs: string[]) {
    const m = { name: "", outlet: "", schedule: "" };
    for (const h of hs) {
      const hh = h.toLowerCase();
      if (!m.name && /(nama|name|dokter|doctor)/.test(hh)) m.name = h;
      else if (!m.outlet && /(outlet|klinik|puskesmas|fasilitas|faskes|tempat|rs\b)/.test(hh)) m.outlet = h;
      else if (!m.schedule && /(jadwal|hari|schedule|jam|praktek)/.test(hh)) m.schedule = h;
    }
    setMapping(m);
  }

  async function handleImport() {
    setMsg(null);
    if (!mapping.name || !mapping.outlet || !mapping.schedule) {
      setMsg({ type: "err", text: "Pilih kolom Nama, Outlet, dan Jadwal dulu." });
      return;
    }

    const doctors = rows.map((r) => {
      const name = String(r[mapping.name] ?? "").trim();
      const outlet = String(r[mapping.outlet] ?? "").trim();
      const scheduleRaw = String(r[mapping.schedule] ?? "");
      const schedules = parseScheduleText(scheduleRaw);
      return { name, outlet, schedules };
    });

    setLoading(true);
    const res = await fetch("/api/doctors/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctors }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMsg({ type: "err", text: data.error || "Gagal import." });
      return;
    }
    setMsg({
      type: "ok",
      text: `✅ ${data.imported} dokter berhasil diimport${data.skipped ? `, ${data.skipped} dilewati` : ""}.`,
    });
    setRows([]);
    setHeaders([]);
    if (fileRef.current) fileRef.current.value = "";
    onImported();
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileSpreadsheet size={18} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Import dari Excel</h3>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="hidden"
        id="excel-file"
      />
      <label
        htmlFor="excel-file"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 p-3 text-sm text-zinc-400 transition-colors hover:border-emerald-400 hover:text-emerald-300"
      >
        <Upload size={16} /> Pilih file Excel / CSV
      </label>

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
        Kolom Jadwal contoh: <code className="text-zinc-500">Senin : 09.00 - 13.00 dan 16.00 - 17.00</code>.
        &quot;selesai&quot; dianggap +2 jam.
      </p>

      {headers.length > 0 && (
        <div className="mt-3 space-y-2">
          <button onClick={() => guessMapping(headers)} className="text-xs text-cyan-400 hover:underline">
            ✨ Auto-map kolom
          </button>
          {(
            [
              ["name", "Kolom Nama Dokter"],
              ["outlet", "Kolom Outlet"],
              ["schedule", "Kolom Jadwal"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="w-32 shrink-0 text-xs text-zinc-400">{label}</label>
              <select
                value={mapping[key]}
                onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-emerald-400"
              >
                <option value="">— pilih kolom —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-zinc-500">{rows.length} baris data</span>
            <button
              onClick={handleImport}
              disabled={loading}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? "Mengimpor..." : "Import"}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            msg.type === "ok"
              ? "border-emerald-500 bg-emerald-950/50 text-emerald-300"
              : "border-red-500 bg-red-950/50 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
