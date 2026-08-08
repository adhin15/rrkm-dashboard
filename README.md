# RRKM Dashboard

Dashboard perencanaan **Rute Kunjungan Mingguan (RRKM)** untuk medical representative (detailer). Kelola jadwal kunjungan dokter dengan kanban board drag & drop, validasi otomatis, import dari Excel, dan tampilan tabel final siap cetak.

> Built as a full-stack Next.js app with Prisma + SQLite.

## Fitur

- **Kanban Board** — Kolom Senin–Sabtu + Pool (dokter belum dijadwalkan). Drag & drop antar kolom.
- **Validasi Otomatis (warna card):**
  - 🔴 **Merah** — Dokter dijadwalkan di hari yang bukan hari prakteknya (drop diblok).
  - 🌸 **Merah muda** — Tabrakan jam kunjungan dengan dokter di **outlet berbeda** (soft warning).
  - 🟢 **Hijau** — Tabrakan jam dengan dokter di **outlet sama** (normal, memang sedang di lokasi yang sama).
- **Badge Target Harian** — Setiap kolom menampilkan jumlah dokter (`7/10`) dengan indikator tercapai/tidak.
- **Sabtu Half-day** — Kolom Sabtu menandai cutoff jam 12:00 sesuai aturan RRKM.
- **Import Excel** — Upload `.xlsx`/`.csv` dengan *column mapping* (pilih kolom nama/outlet/hari/jam).
- **Input Manual** — Tambah dokter langsung dari UI.
- **Table View** — Tampilan tabel final per hari dengan status detail, toggle Kanban ⇄ Table.
- **Set Minggu Baru** — Reset semua jadwal kembali ke Pool untuk minggu berikutnya.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma 5 |
| Database | SQLite |
| Drag & Drop | @dnd-kit |
| Excel | SheetJS (xlsx) |
| Icons | Lucide React |
| Styling | Tailwind CSS 4 |

## Menjalankan Lokal

```bash
npm install
npx prisma db push          # buat database SQLite
npm run seed                # (opsional) isi data contoh dokter
npm run dev                 # http://localhost:3000
```

## Struktur

```
app/
  page.tsx                  # Halaman utama (server component, force-dynamic)
  api/doctors/route.ts      # CRUD dokter
  api/doctors/bulk/route.ts # Import massal dari Excel
components/
  Board.tsx                 # Orkestrasi: toggle view, reset minggu, data
  KanbanBoard.tsx           # DndContext + validasi drop
  KanbanColumn.tsx          # Kolom hari/Pool
  DoctorCard.tsx            # Card dengan warna state
  DoctorForm.tsx            # Input manual
  ImportExcel.tsx           # Upload + column mapping
  TableView.tsx             # Tabel final RRKM
lib/
  collision.ts              # ⭐ Core logic: evaluasi warna card
  prisma.ts                 # PrismaClient singleton
  types.ts                  # Tipe & konstanta (hari, state warna)
```

## Logika Warna (core)

`lib/collision.ts` mengevaluasi setiap card terhadap kolom (hari) dan card lain di kolom yang sama, dengan prioritas:

1. **Hari bukan hari praktek** → invalid (MERAH), drop diblok.
2. **Tabrakan jam, outlet beda** → soft warning (MERAH MUDA).
3. **Tabrakan jam, outlet sama** → normal (HIJAU).
4. Tidak ada masalah → normal.

Satu card hanya menampilkan satu state; konflik dengan outlet berbeda selalu diutamakan di atas outlet sama.

## Lisensi

Private / untuk keperluan showcase.
