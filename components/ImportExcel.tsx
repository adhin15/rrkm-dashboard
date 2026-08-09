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

/**
 * Deteksi & normalisasi sheet Excel jadi format flat:
 * header (Nama | Outlet | Jadwal) + 1 baris per dokter, dengan jadwal semua
 * hari digabung dalam 1 sel (dipisah " | ").
 *
 * Mendukung:
 *  - Header di baris mana pun (tidak harus row 1)
 *  - Header typo seperti "Oulet" (tanpa 's')
 *  - 1 dokter yang membentang beberapa baris (nama/outlet di baris pertama,
 *    tiap baris berisi 1 hari jadwal) — nama di-forward-fill & jadwal digabung
 *  - Format standar (header row 1, semua hari dalam 1 sel)
 */
function normalizeSheet(sheet: XLSX.WorkSheet): {
  headers: string[];
  rows: Record<string, unknown>[];
} | null {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (!raw.length) return null;

  const isName = (v: unknown) => /nama|name|dokter|doctor/i.test(String(v));
  const isOutlet = (v: unknown) => /(oule?t|klinik|puskesmas|fasilitas|faskes|tempat|\brs\b)/i.test(String(v));
  const isSchedule = (v: unknown) => /(jadwal|hari|schedule|jam|praktek)/i.test(String(v));

  // Cari baris header (scan sampai 15 baris pertama)
  let headerRow = -1,
    nameIdx = -1,
    outletIdx = -1,
    schedIdx = -1;
  for (let r = 0; r < Math.min(raw.length, 15); r++) {
    const row = raw[r];
    let n = -1,
      o = -1,
      s = -1;
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (isName(v) && n === -1) n = c;
      else if (isOutlet(v) && o === -1) o = c;
      else if (isSchedule(v) && s === -1) s = c;
    }
    if (n !== -1 && s !== -1) {
      headerRow = r;
      nameIdx = n;
      outletIdx = o;
      schedIdx = s;
      break;
    }
  }
  if (headerRow === -1) return null;

  // Forward-fill nama/outlet + gabung jadwal per dokter
  const doctors: { name: string; outlet: string; scheds: string[] }[] = [];
  let cur: { name: string; outlet: string; scheds: string[] } | null = null;
  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r];
    const name = String(row[nameIdx] ?? "").trim();
    const outlet = outletIdx >= 0 ? String(row[outletIdx] ?? "").trim() : "";
    const sched = String(row[schedIdx] ?? "").trim();

    if (name) {
      cur = { name, outlet, scheds: sched ? [sched] : [] };
      doctors.push(cur);
    } else if (cur) {
      if (outlet && !cur.outlet) cur.outlet = outlet;
      if (sched) cur.scheds.push(sched);
    }
  }

  const headers = ["Nama", "Outlet", "Jadwal"];
  const rows = doctors.map((d) => ({
    Nama: d.name,
    Outlet: d.outlet,
    Jadwal: d.scheds.join(" | "),
  }));
  return { headers, rows };
}

function parseTime(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (m) return `${Number(m[1]).toString().padStart(2, "0")}:${m[2]}`;
  return null;
}

// Parse sel text jadwal: "Senin : 09.00 - 13.00 dan 16.00 - 17.00"
// atau format flat "09.00" / "13.00" per kolom.
// Juga handle "Setiap Hari" -> Senin-Sabtu (6 hari).
// Mengembalikan { schedules, flexible }.
function parseScheduleText(raw: string): {
  schedules: { day: DayKey; startTime: string; endTime: string }[];
  flexible: boolean;
} {
  const out: { day: DayKey; startTime: string; endTime: string }[] = [];
  let flexible = false;
  const parts = raw.split(/[;,|]/).filter(Boolean);
  for (const part of parts) {
    const trimmed = part.trim();

    // "Setiap Hari" (dengan atau tanpa jam) -> Senin-Sabtu
    const setiap = trimmed.match(/^setiap\s+hari\s*([\s\S]*)$/i);
    if (setiap) {
      const rest = setiap[1].trim();
      // cari jam di awal (ignore teks tambahan setelahnya, mis. "konfirmasi apotek dulu")
      const tm = rest.match(/^(\d{1,2}[.:]\d{2})\s*[-–]\s*(\d{1,2}[.:]\d{2})/);
      if (tm) {
        // ada jam spesifik -> terapkan ke 6 hari
        const start = parseTime(tm[1]);
        const end = parseTime(tm[2]);
        if (start && end) {
          for (const day of ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as DayKey[]) {
            out.push({ day, startTime: start, endTime: end });
          }
        }
      } else {
        // tanpa jam -> flexible, default 09:00-18:00 utk 6 hari
        flexible = true;
        for (const day of ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as DayKey[]) {
          out.push({ day, startTime: "09:00", endTime: "18:00" });
        }
      }
      continue;
    }

    // format normal "Hari : jam"
    const m = trimmed.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
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
  return { schedules: out, flexible };
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

        // Pilih sheet terbaik: coba semua, ambil yang menghasilkan dokter terbanyak
        // & outlet lengkap (hindari sheet RRKM/jadwal yang bukan master dokter)
        let best: { headers: string[]; rows: Record<string, unknown>[] } | null = null;
        let bestScore = -1;
        for (const name of wb.SheetNames) {
          const n = normalizeSheet(wb.Sheets[name]);
          if (!n || n.rows.length === 0) continue;
          const withOutlet = n.rows.filter((r) => String(r.Outlet ?? "").trim()).length;
          const score = n.rows.length + withOutlet; // preferensi: banyak baris + outlet lengkap
          if (score > bestScore) {
            bestScore = score;
            best = n;
          }
        }

        if (!best) {
          setMsg({ type: "err", text: "Tidak menemukan kolom Nama & Jadwal. Pastikan file valid." });
          return;
        }
        setHeaders(best.headers);
        setRows(best.rows);
        setMapping({ name: "Nama", outlet: "Outlet", schedule: "Jadwal" });
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
      const { schedules, flexible } = parseScheduleText(scheduleRaw);
      return { name, outlet, schedules, flexible };
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
