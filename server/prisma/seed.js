import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Services
  const services = [
    { name: "Banho e Tosa", priceCents: 9000, durationMinutes: 90 },
    { name: "Banho Simples", priceCents: 6000, durationMinutes: 45 },
    { name: "Tosa Higiênica", priceCents: 5000, durationMinutes: 30 },
    { name: "Consulta Veterinária", priceCents: 12000, durationMinutes: 30 },
    { name: "Vacinação", priceCents: 8000, durationMinutes: 20 }
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: s,
      create: s
    });
  }

  // One default resource
  const resource = await prisma.resource.upsert({
    where: { id: 1 },
    update: { name: "Geral" },
    create: { id: 1, name: "Geral" }
  });

  // Sample pets
  const rex = await prisma.pet.create({
    data: {
      name: "Rex",
      breed: "Golden Retriever",
      ownerName: "Maria Silva",
      phone: "(11) 99999-9999",
      photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop&crop=face",
      color: "Dourado",
      weight: "28 kg",
      age: "3 anos",
      chip: "982000123456789",
      birthDate: new Date("2021-03-15T12:00:00Z")
    }
  });
  const luna = await prisma.pet.create({
    data: {
      name: "Luna",
      breed: "Gato Persa",
      ownerName: "Ana Costa",
      phone: "(11) 77777-7777",
      photoUrl: "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=200&h=200&fit=crop&crop=face",
      color: "Branco",
      weight: "4.5 kg",
      age: "2 anos",
      chip: "982000987654321",
      birthDate: new Date("2022-01-08T12:00:00Z")
    }
  });

  // Two sample appointments on an arbitrary day
  const day = "2024-08-20";
  const svcBanho = await prisma.service.findFirst({ where: { name: "Banho e Tosa" } });
  const svcCons = await prisma.service.findFirst({ where: { name: "Consulta Veterinária" } });

  function toUTC(dateLocal, time) {
    // naive parse in America/Sao_Paulo (UTC-3) → UTC by adding 3 hours
    const [y, m, d] = dateLocal.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    // Build JS date in local machine TZ; for seed, simpler: treat local as -03:00 and add 3h
    const local = new Date(Date.UTC(y, m-1, d, hh+3, mm, 0, 0));
    return local;
  }
  function addMinutes(date, m) { return new Date(date.getTime() + m*60000); }

  const s1 = toUTC(day, "09:00");
  await prisma.appointment.create({
    data: {
      clientName: "Maria Silva",
      phone: "(11) 99999-9999",
      startUTC: s1,
      endUTC: addMinutes(s1, svcBanho.durationMinutes),
      dateLocal: day,
      notes: "Pet: Rex (Golden Retriever)",
      serviceId: svcBanho.id,
      petId: rex.id,
      resourceId: resource.id,
      status: "CONFIRMED"
    }
  });

  const s2 = toUTC(day, "14:00");
  await prisma.appointment.create({
    data: {
      clientName: "Ana Costa",
      phone: "(11) 77777-7777",
      startUTC: s2,
      endUTC: addMinutes(s2, svcCons.durationMinutes),
      dateLocal: day,
      notes: "Pet: Luna (Gato Persa)",
      serviceId: svcCons.id,
      petId: luna.id,
      resourceId: resource.id,
      status: "CONFIRMED"
    }
  });
}

main().then(async () => {
  console.log("Seed complete.");
  await prisma.$disconnect();
}).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
