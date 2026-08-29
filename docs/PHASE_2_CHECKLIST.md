# Phase 2 — Resource CRUD & Availability Engine

Goal: Allow administrators to manage institutional resources (seminar halls, labs, classrooms, equipment)
and provide a high-performance Availability Engine that calculates free vs. reserved time slots without
double-booking ambiguity.

Work through these in order. Each step = one approval → one code generation turn.

- [x] **2.1 Resource model**
      `server/src/models/Resource.js` — fields: name, type (enum: seminar_hall, lab, classroom,
      auditorium, equipment), capacity, location (building, floor, roomNumber), amenities
      (array of strings), status (enum: available, maintenance, unavailable), isActive (soft-delete),
      createdBy (ref: User), timestamps.

- [x] **2.2 Resource domain service**
      `server/src/services/resourceService.js` — createResource, getResourceById,
      listResources (with pagination `page/limit`, filtering by type/minCapacity/status, search by name),
      updateResource, deleteResource (soft-delete `isActive: false`).

- [x] **2.3 Resource controller & routes**
      `server/src/controllers/resourceController.js`, `server/src/routes/resourceRoutes.js`.
      Endpoints:
      - `GET /api/v1/resources` (authenticated users, paginated list + filters)
      - `GET /api/v1/resources/:id` (authenticated users, resource details)
      - `POST /api/v1/resources` (`admin` only)
      - `PUT /api/v1/resources/:id` (`admin` only)
      - `DELETE /api/v1/resources/:id` (`admin` only, soft-delete)

- [x] **2.4 Resource validation schemas**
      `server/src/validations/resourceValidation.js` + Zod schemas for create, update, and
      query parameter validation.

- [x] **2.5 Availability Engine**
      `server/src/services/availabilityEngine.js` — reusable service computing free/busy slots
      for a resource across a requested date/time window. Incorporates operating hours and
      filters out overlapping `approved` or `pending` bookings.

- [x] **2.6 Availability endpoint**
      `GET /api/v1/resources/:id/availability?date=YYYY-MM-DD` controller handler and route wiring.

- [x] **2.7 Client resource browsing & availability UI**
      `client/src/services/resourceService.js`, `client/src/pages/Resources.jsx` (resource catalogue,
      filter bar by type/capacity, details view with availability slot indicator),
      admin resource management modal/form.

- [x] **2.8 Phase 2 Smoke test**
      `server/tests/phase2_smoke.test.js` verifying Admin CRUD permissions, student read-only access,
      pagination/filters, and availability calculations.

**Exit criteria for Phase 2:** Admin can create/update/soft-delete resources, students/faculty can
browse and filter resources, and the Availability Engine accurately reports free slots for any given date.

---
Next up after this is approved: **Phase 3 — Conflict-Free Booking Engine & Queuing.**
