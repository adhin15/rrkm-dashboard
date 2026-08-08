import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Data contoh dokter untuk tes (area selatan — konsisten dgn case RRKM)
const doctors = [
  // Praktek hari tertentu, beberapa tabrakan sengaja dibuat untuk tes warna
  { name: "dr. Andi Pratama", outlet: "Puskesmas Sukamaju", practiceDays: "SENIN,RABU", practiceStart: "09:00", practiceEnd: "11:00" },
  { name: "dr. Budi Santoso", outlet: "Puskesmas Sukamaju", practiceDays: "SENIN", practiceStart: "09:30", practiceEnd: "11:30" }, // tabrakan dgn Andi, outlet SAMA -> HIJAU
  { name: "dr. Citra Lestari", outlet: "Klinik Sehat", practiceDays: "SENIN", practiceStart: "10:00", practiceEnd: "12:00" }, // tabrakan dgn Andi, outlet BEDA -> MERAH MUDA
  { name: "dr. Dewi Anggraini", outlet: "Puskesmas Sukamaju", practiceDays: "SELASA", practiceStart: "08:00", practiceEnd: "10:00" },
  { name: "dr. Eko Wijaya", outlet: "RS Bhayangkara", practiceDays: "SELASA,KAMIS", practiceStart: "09:00", practiceEnd: "11:00" },
  { name: "dr. Fitri Handayani", outlet: "Klinik Harapan", practiceDays: "RABU", practiceStart: "13:00", practiceEnd: "15:00" },
  { name: "dr. Gilang Ramadhan", outlet: "Puskesmas Sukamaju", practiceDays: "KAMIS", practiceStart: "09:00", practiceEnd: "12:00" },
  { name: "dr. Hesti Puspita", outlet: "RS Bhayangkara", practiceDays: "JUMAT", practiceStart: "08:30", practiceEnd: "11:00" },
  { name: "dr. Irfan Hakim", outlet: "Klinik Medika", practiceDays: "JUMAT", practiceStart: "09:00", practiceEnd: "10:00" },
  { name: "dr. Joko Susilo", outlet: "Puskesmas Sukamaju", practiceDays: "SABTU", practiceStart: "08:00", practiceEnd: "12:00" }, // Sabtu half-day
  { name: "dr. Kurnia Sari", outlet: "Klinik Harapan", practiceDays: "SABTU", practiceStart: "09:00", practiceEnd: "11:00" },
  { name: "dr. Lina Marlina", outlet: "RS Bhayangkara", practiceDays: "SENIN,SELASA", practiceStart: "13:00", practiceEnd: "16:00" },
  { name: "dr. Maman Suryadi", outlet: "Puskesmas Sukamaju", practiceDays: "RABU,KAMIS", practiceStart: "09:00", practiceEnd: "11:00" },
  { name: "dr. Nia Ramadhani", outlet: "Klinik Sehat", practiceDays: "KAMIS,JUMAT", practiceStart: "10:00", practiceEnd: "12:00" },
  { name: "dr. Oki Setiawan", outlet: "Klinik Medika", practiceDays: "SELASA", practiceStart: "14:00", practiceEnd: "16:00" },
  { name: "dr. Putri Ayu", outlet: "Puskesmas Sukamaju", practiceDays: "JUMAT", practiceStart: "08:00", practiceEnd: "10:00" },
];

async function main() {
  // Kosongkan dulu
  await prisma.doctor.deleteMany({});
  let pos = 1;
  for (const d of doctors) {
    await prisma.doctor.create({ data: { ...d, scheduledDay: null, position: pos++ } });
  }
  console.log(`Seeded ${doctors.length} dokter (semua di Pool)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
