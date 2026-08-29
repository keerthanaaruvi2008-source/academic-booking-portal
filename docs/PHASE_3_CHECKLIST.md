# Phase 3 — Conflict-Free Booking Engine & Queuing

Goal: Implement an unbreachable reservation engine where double-booking is structurally impossible across concurrent requests,
providing atomic MongoDB transaction writes, 409 Conflict error envelopes with suggested alternative slots, approval workflows,
and reservation UI.

Work through these in order. Each step = one approval → one code generation turn.

- [x] **3.1 Booking Conflict Service**
      `server/src/services/bookingConflictService.js` — atomic overlap validation, MongoDB transaction-guarded
      write execution (`session.withTransaction`), conflict diagnostic extraction, and alternative slot suggestion algorithm.

- [x] **3.2 Booking domain service**
      `server/src/services/bookingService.js` — createBooking (conflict-checked & transaction-wrapped), getBookingById,
      listBookings (paginated with status/user/resource/date filters), approveBooking (admin only), rejectBooking (admin only),
      cancelBooking (owner or admin).

- [x] **3.3 Booking validation schemas**
      `server/src/validations/bookingValidation.js` + Zod schemas for create booking (validating startTime < endTime,
      future date, duration limits), status updates, rejection reasons, and query filters.

- [x] **3.4 Booking controller & routes**
      `server/src/controllers/bookingController.js`, `server/src/routes/bookingRoutes.js`.
      Endpoints:
      - `POST /api/v1/bookings` (authenticated: student/faculty/admin, returns 201 or 409 Conflict)
      - `GET /api/v1/bookings` (authenticated: user bookings or all for admin, paginated)
      - `GET /api/v1/bookings/:id` (authenticated: owner or admin)
      - `PATCH /api/v1/bookings/:id/approve` (admin only)
      - `PATCH /api/v1/bookings/:id/reject` (admin only)
      - `PATCH /api/v1/bookings/:id/cancel` (owner or admin)

- [x] **3.5 Concurrency Stress Testing**
      `server/tests/booking_concurrency.test.js` — simultaneous race-condition tests submitting parallel booking requests
      for identical slots, asserting that exactly one succeeds and all other requests receive 409 Conflict.

- [x] **3.6 Client booking service & state**
      `client/src/services/bookingService.js` — API call wrappers for reservation management, approvals, cancellations.

- [x] **3.7 Client booking & reservation UI**
      `client/src/pages/Bookings.jsx` (my bookings list, admin pending approval queue, status filter badges, cancellation triggers),
      `client/src/components/BookingModal.jsx` (reservation form modal with slot selection and 409 Conflict error feedback),
      `client/src/components/RejectBookingModal.jsx` (admin rejection reason dialog).

- [x] **3.8 Phase 3 Smoke test**
      `server/tests/phase3_smoke.test.js` verifying booking creation, conflict 409 rejection with suggested slots, admin approval/rejection,
      user cancellation, and RBAC security.

**Exit criteria for Phase 3:** Double-booking is structurally impossible across high-concurrency requests, overlapping submissions
fail fast with 409 Conflict, admin approval/rejection works, and users can manage their reservations via the client UI.

---
Next up after this is approved: **Phase 4 — AI Assistant Endpoint (FastAPI / Gemini NL Search).**
