# Agenda Pet Shop — Backend (Express + Prisma + SQLite)

## Requisitos
- Node.js 18+
- npm
- (opcional) `pnpm` ou `yarn`

## Setup
```bash
cd server
cp .env.example .env
npm i
npm run prisma:generate
npm run prisma:push      # ou: npm run prisma:migrate
npm run seed
npm run dev
```

API por padrão roda em `http://localhost:3333`.

### Endpoints principais
- `GET /health` — healthcheck
- `GET /api/services` — lista serviços
- `POST /api/services` — cria serviço `{ name, priceCents, durationMinutes }`
- `GET /api/pets` — lista pets
- `POST /api/pets` — cria pet básico
- `GET /api/resources` — lista recursos (ex.: baias/funcionários)
- `POST /api/resources` — cria recurso `{ name }`
- `GET /api/appointments?date=YYYY-MM-DD&resourceId=1` — lista agendamentos
- `POST /api/appointments` — cria agendamento
```json
{
  "clientName": "Maria Silva",
  "phone": "(11) 99999-9999",
  "date": "2025-08-21",
  "time": "09:30",
  "serviceId": 1,
  "petId": 2,
  "resourceId": 1,
  "notes": "Observações"
}
```
- `PATCH /api/appointments/:id/status` — altera status `{ "status": "DONE" }`
- `GET /api/slots?date=YYYY-MM-DD&resourceId=1&serviceId=1` — slots com disponibilidade (considera duração do serviço se informado)

### Observações de horário/timezone
- O backend interpreta `date` e `time` como horário **local** `America/Sao_Paulo` e converte para UTC antes de salvar.
- Conflitos são calculados por intervalo de tempo, considerando a **duração** do serviço.
