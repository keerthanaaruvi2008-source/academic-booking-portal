# Phase 1 — Environment & Auth Setup (JWT + RBAC)

Goal: a running skeleton where a user can register, log in, and hit a protected route,
with roles (`student`, `faculty`, `admin`) enforced. No booking logic yet — this phase is
pure foundation.

Work through these in order. Each step = one approval → one code generation turn.

- [x] **1.1 Server bootstrap**
      `server/package.json`, `server/.env.example`, `server/src/server.js`,
      `server/src/app.js` (Express app config: cors, json parsing, helmet, morgan),
      `server/src/config/db.js` (Mongoose connection with retry + fail-fast on missing
      `MONGO_URI`), `server/src/config/constants.js` (roles + booking status enums).

- [x] **1.2 Client bootstrap**
      `client/package.json`, Vite React scaffold config, `client/src/main.jsx`,
      `client/src/App.jsx`, base router setup (React Router), `client/src/services/api.js`
      (Axios instance with baseURL + interceptor for attaching JWT).

- [x] **1.3 User model**
      `server/src/models/User.js` — fields: name, email (unique, indexed), passwordHash,
      role (enum: student/faculty/admin), department, isActive, timestamps. Password
      hashing via bcrypt pre-save hook.

- [x] **1.4 Auth service & controller**
      `server/src/services/authService.js` (register, login, token issuance, refresh),
      `server/src/controllers/authController.js`, `server/src/routes/authRoutes.js`.
      Endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
      `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.

- [x] **1.5 JWT + RBAC middleware**
      `server/src/middleware/auth.js` (verify access token, attach `req.user`),
      `server/src/middleware/rbac.js` (`requireRole(['admin'])` style guard),
      `server/src/middleware/errorHandler.js` (centralized error + 409/403/401 shaping).

- [x] **1.6 Validation layer**
      `server/src/middleware/validate.js` + zod schemas for register/login payloads.

- [x] **1.7 Client auth flow**
      `client/src/context/AuthContext.jsx` (login/logout/register, token storage,
      current-user state), `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`,
      a `ProtectedRoute` wrapper component that checks role before rendering.

- [x] **1.8 Smoke test**
      `server/tests/smoke.test.js` hitting register → login → protected `/api/v1/users/me`
      route, asserting a `student` gets 200 and an unauthenticated request gets 401.

**Exit criteria for Phase 1:** Registering a user, logging in, receiving a JWT, and
successfully calling a role-protected endpoint works end-to-end, on both server (via test)
and client (via manual UI check). Nothing about Resources or Bookings is touched yet.

---
Next up after this is approved: **Phase 2 — Resource CRUD & Availability Engine.**
