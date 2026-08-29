# Academic Event & Resource Booking Portal

A centralized MERN platform for reserving seminar halls, labs, classrooms, and institutional
resources — engineered so double-booking is structurally impossible, not just checked for.
Includes an optional Python/FastAPI microservice for LLM-powered natural language booking
search and conflict-resolution advice.

## Stack
- **Client:** React (Vite) + React Router + Context API + Axios
- **Server:** Node.js + Express.js + Mongoose (MongoDB)
- **AI Service (optional):** Python + FastAPI + OpenAI/Gemini
- **Auth:** JWT (access + refresh) with role-based access control (student/faculty/admin)

## Repo Structure
```
academic-booking-portal/
├── .cursorrules              # AI coding assistant rules — read this first
├── client/                   # React SPA
│   └── src/{components,pages,context,hooks,services,utils}
├── server/                   # Express API
│   └── src/{config,controllers,models,routes,middleware,services,jobs}
├── ai-service/                # FastAPI microservice (optional, called only by /server)
│   └── app/{routers,services,schemas}
└── docs/
    └── PHASE_1_CHECKLIST.md  # Current build phase — work item by item
```

## Build Roadmap
1. **Phase 1 — Environment & Auth Setup** (JWT + RBAC) — see `docs/PHASE_1_CHECKLIST.md`
2. **Phase 2 — Resource CRUD & Availability Engine**
3. **Phase 3 — Conflict-Free Booking Engine & Queuing**
4. **Phase 4 — AI Assistant Endpoint** (FastAPI / Gemini for natural language room search)
5. **Phase 5 — Dashboard UI** (calendar views & admin approval workflows)

Each phase has (or will have) its own checklist doc in `docs/`. Work through items one at a
time — propose, approve, generate, verify, move on.

## Core Invariant
No two `approved`/`pending` bookings may overlap for the same resource. This is enforced at
the database, service, and API layers — see section 4 of `.cursorrules` for the full design.
