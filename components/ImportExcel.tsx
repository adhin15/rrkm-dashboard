"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  onImported: () => void;
}

// Header yang dikenali
const DAY_ALIAS: Record<string, string[]> = {
  SENIN: ["SENIN", "MON", "MONDAY"],
  SELASA: ["SELASA", "TUE", "TUESDAY"],
  RABU: ["RABU", "WED", "WEDNESDAY"],
  KAMIS: ["KAMIS", "THU", "THURSDAY"],
  JUMAT: ["JUMAT", "FRI", "FRIDAY"],
  SABTU: ["SABTU", "SAT", "SATURDAY"],
};

export default function ImportExcel({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState({ name: "", outlet: "", days: "", start: "", end: "" });
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
        const headerRow = Object.keys(data[0]);
        setHeaders(headerRow);
        setRows(data);
      } catch {
        setMsg({ type: "err", text: "Gagal membaca file. Pastikan formatnya .xlsx / .csv." });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Auto-suggest kolom saat header berubah
  function guessMapping(hs: string[]) {
    const m = { name: "", outlet: "", days: "", start: "", end: "" };
    for (const h of hs) {
      const hh = h.toLowerCase();
      if (!m.name && /(nama|name|dokter|doctor)/.test(hh)) m.name = h;
      else if (!m.outlet && /(outlet|klinik|puskesmas|fasilitas|faskes|tempat)/.test(hh)) m.outlet = h;
      else if (!m.days && /(hari|day|praktek|practice|jadwal)/.test(hh)) m.days = h;
      else if (!m.start && /(mulai|start|jam.*awal|dari)/.test(hh)) m.start = h;
      else if (!m.end && /(selesai|end|jam.*akhir|sampai)/.test(hh)) m.end = h;
    }
    setMapping(m);
  }

  function onSelectFile() {
    // re-trigger guess setelah headers set
  }

  function parseDaysCell(v: unknown): string {
    const s = String(v ?? "")
      .toUpperCase()
      .replace(/[|;]/g, ",");
    const found = new Set<string>();
    for (const part of s.split(",")) {
      const p = part.trim();
      for (const [code, aliases] of Object.entries(DAY_ALIAS)) {
        if (aliases.includes(p)) found.add(code);
      }
    }
    return Array.from(found).join(",");
  }

  function normTime(v: unknown): string | null {
    const s = String(v ?? "").trim();
    if (!s) return null;
    // "09:00", "9:00", "0900", "9", "9AM"...
    const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (m[3]) {
      const pm = m[3].toLowerCase() === "pm";
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  async function handleImport() {
    setMsg(null);
    if (!mapping.name || !mapping.outlet) {
      setMsg({ type: "err", text: "Pilih kolom Nama & Outlet dulu." });
      return;
    }

    const doctors = rows.map((r) => ({
      name: String(r[mapping.name] ?? "").trim(),
      outlet: String(r[mapping.outlet] ?? "").trim(),
      practiceDays: mapping.days ? parseDaysCell(r[mapping.days]) : "",
      practiceStart: mapping.start ? (normTime(r[mapping.start]) ?? "") : "09:00",
      practiceEnd: mapping.end ? (normTime(r[mapping.end]) ?? "") : "11:00",
    }));

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
        onChange={(e) => {
          handleFile(e);
          onSelectFile();
        }}
        className="hidden"
        id="excel-file"
      />
      <label
        htmlFor="excel-file"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 p-3 text-sm text-zinc-400 transition-colors hover:border-emerald-400 hover:text-emerald-300"
      >
        <Upload size={16} /> Pilih file Excel / CSV
      </label>

      {headers.length > 0 && (
        <div className="mt-3 space-y-2">
          <button
            onClick={() => guessMapping(headers)}
            className="text-xs text-cyan-400 hover:underline"
          >
            ✨ Auto-map kolom
          </button>

          {(
            [
              ["name", "Kolom Nama Dokter"],
              ["outlet", "Kolom Outlet"],
              ["days", "Kolom Hari Praktek"],
              ["start", "Kolom Jam Mulai"],
              ["end", "Kolom Jam Selesai"],
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
