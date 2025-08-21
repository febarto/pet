import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import { z } from 'zod';

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3333;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const BUSINESS_START = process.env.BUSINESS_START || '09:00';
const BUSINESS_END = process.env.BUSINESS_END || '17:00';
const SLOT_MINUTES = parseInt(process.env.SLOT_MINUTES || '30', 10);
const TZ = 'America/Sao_Paulo';

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Helpers
const toUTC = (dateLocalStr, timeStr) => {
  // Interpret the local date/time in America/Sao_Paulo and convert to UTC
  const dt = DateTime.fromISO(`${dateLocalStr}T${timeStr}`, { zone: TZ });
  return dt.toUTC();
};
const addMinutes = (dt, minutes) => dt.plus({ minutes });

const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

async function listAppointmentsByDateResource(dateLocal, resourceId) {
  return prisma.appointment.findMany({
    where: { dateLocal, resourceId },
    include: { service: true, pet: true, resource: true },
    orderBy: { startUTC: 'asc' }
  });
}

app.get('/api/services', async (req, res) => {
  const services = await prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  res.json(services.map(s => ({
    id: s.id, name: s.name, priceCents: s.priceCents, durationMinutes: s.durationMinutes
  })));
});

app.post('/api/services', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    priceCents: z.number().int().nonnegative(),
    durationMinutes: z.number().int().positive()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const svc = await prisma.service.create({ data: parsed.data });
  res.status(201).json(svc);
});

app.get('/api/pets', async (req, res) => {
  const pets = await prisma.pet.findMany({ orderBy: { name: 'asc' } });
  res.json(pets);
});

app.post('/api/pets', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    breed: z.string().min(1),
    ownerName: z.string().min(1),
    phone: z.string().min(6),
    photoUrl: z.string().url().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const pet = await prisma.pet.create({ data: parsed.data });
  res.status(201).json(pet);
});

app.get('/api/resources', async (req, res) => {
  const resources = await prisma.resource.findMany({ orderBy: { id: 'asc' } });
  res.json(resources);
});

app.post('/api/resources', async (req, res) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const r = await prisma.resource.create({ data: parsed.data });
  res.status(201).json(r);
});

// List appointments (optionally by date)
app.get('/api/appointments', async (req, res) => {
  const { date, resourceId } = req.query;
  const where = {};
  if (date) where.dateLocal = String(date);
  if (resourceId) where.resourceId = Number(resourceId);
  const appts = await prisma.appointment.findMany({
    where,
    include: { service: true, pet: true, resource: true },
    orderBy: [{ dateLocal: 'asc' }, { startUTC: 'asc' }]
  });
  res.json(appts);
});

// Create appointment with conflict check
app.post('/api/appointments', async (req, res) => {
  const schema = z.object({
    clientName: z.string().min(1),
    phone: z.string().min(6),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    serviceId: z.number().int(),
    petId: z.number().int().optional(),
    resourceId: z.number().int().default(1),
    notes: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { clientName, phone, date, time, serviceId, petId, resourceId, notes } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return res.status(400).json({ error: 'Serviço inválido' });

  const start = toUTC(date, time);
  const nowUTC = DateTime.utc();
  if (start <= nowUTC.minus({ minutes: 1 })) {
    return res.status(400).json({ error: 'Não é possível agendar no passado.' });
  }
  const end = addMinutes(start, service.durationMinutes);

  // Conflict check for the same resource
  const sameDay = await listAppointmentsByDateResource(date, resourceId);
  const conflict = sameDay.some(a => overlap(start, end, DateTime.fromJSDate(a.startUTC), DateTime.fromJSDate(a.endUTC)));
  if (conflict) return res.status(409).json({ error: 'Conflito de horário para este recurso.' });

  const created = await prisma.appointment.create({
    data: {
      clientName, phone,
      startUTC: start.toJSDate(),
      endUTC: end.toJSDate(),
      dateLocal: date,
      serviceId, petId, resourceId, notes,
      status: 'CONFIRMED'
    },
    include: { service: true, pet: true, resource: true }
  });

  res.status(201).json(created);
});

// Update status
app.patch('/api/appointments/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ status: z.enum(['PENDING','CONFIRMED','IN_SERVICE','DONE','CANCELED']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status }
  });
  res.json(updated);
});

// Slots availability (considers service duration if provided)
app.get('/api/slots', async (req, res) => {
  const date = String(req.query.date || '');
  const resourceId = Number(req.query.resourceId || 1);
  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Parâmetro date inválido. Use YYYY-MM-DD.' });
  }

  const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;
  const dur = service ? service.durationMinutes : SLOT_MINUTES;

  // Generate slots between BUSINESS_START and BUSINESS_END
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h*60 + m;
  };
  const startMin = toMinutes(BUSINESS_START);
  const endMin = toMinutes(BUSINESS_END);

  const slots = [];
  for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
    const hh = String(Math.floor(m/60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }


  const sameDay = await listAppointmentsByDateResource(date, resourceId);

  const withAvailability = slots.map(time => {
    // If checking against service duration, ensure full window [start, start+dur) is free
    const start = toUTC(date, time);
    const end = addMinutes(start, dur);
    const col = sameDay.some(a => overlap(start, end, DateTime.fromJSDate(a.startUTC), DateTime.fromJSDate(a.endUTC)));
    return { time, available: !col };
  });

  res.json({ date, resourceId, serviceId, slotMinutes: SLOT_MINUTES, durationConsidered: dur, slots: withAvailability });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
