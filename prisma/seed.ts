import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

type SeedSchedule = { day: string; startTime: string; endTime: string };
type SeedDoctor = {
  name: string;
  outlet: string;
  schedules: SeedSchedule[];
  flexible?: boolean;
};

async function main() {
  // Bersihkan data lama (relasi Schedule ter-cascade)
  await prisma.doctor.deleteMany({});
  console.log("Data lama dibersihkan");

  const seedFile = path.join(__dirname, "seed-data", "selatan.json");
  let doctors: SeedDoctor[];
  try {
    doctors = JSON.parse(fs.readFileSync(seedFile, "utf8"));
  } catch {
    console.log("File seed real tidak ditemukan, pakai fallback data contoh.");
    doctors = fallback();
  }

  let pos = 1;
  for (const d of doctors) {
    if (!d.name || !d.outlet || !d.schedules?.length) continue;
    await prisma.doctor.create({
      data: {
        name: d.name,
        outlet: d.outlet,
        scheduledDay: null,
        position: pos++,
        flexible: d.flexible === true,
        schedules: { create: d.schedules },
      },
    });
  }

  console.log(`Seeded ${pos - 1} dokter dari data area selatan (semua di Pool)`);
}

// Fallback kecil kalau file seed real tidak ada
function fallback(): SeedDoctor[] {
  return [
    {
      name: "dr. Andi Pratama",
      outlet: "Puskesmas Sukamaju",
      schedules: [
        { day: "SENIN", startTime: "09:00", endTime: "11:00" },
        { day: "RABU", startTime: "09:00", endTime: "11:00" },
      ],
    },
    {
      name: "dr. Budi Santoso",
      outlet: "Puskesmas Sukamaju",
      schedules: [{ day: "SENIN", startTime: "09:30", endTime: "11:30" }],
    },
    {
      name: "dr. Citra Lestari",
      outlet: "Klinik Sehat",
      schedules: [{ day: "SENIN", startTime: "10:00", endTime: "12:00" }],
    },
  ];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
