import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ===== POST /api/doctors/flush — HAPUS SEMUA data dokter & jadwal =====
// Dipakai saat ganti minggu & mau import daftar dokter baru dari nol.
// Hapus Schedule dulu (relasi) sebelum Doctor.
// PERINGATAN: destruktif, tidak bisa di-rollback.
export async function POST() {
  await prisma.$transaction([
    prisma.schedule.deleteMany(),
    prisma.doctor.deleteMany(),
  ]);
  return NextResponse.json({ ok: true, message: "Semua data dokter telah dihapus" });
}
