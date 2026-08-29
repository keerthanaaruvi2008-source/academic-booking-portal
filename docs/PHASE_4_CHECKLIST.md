# Phase 4 — AI Assistant Endpoint (NL Search & Recommendation Engine)

Goal: Provide an intelligent, read-only AI Advisor that parses natural language queries, extracts structured reservation parameters,
ranks matching campus facilities, calculates open time slots, and returns structured action chips to pre-fill booking requests
with zero-hallucination guarantees and graceful offline fallback.

Work through these in order. Each step = one approval → one code generation turn.

- [x] **4.1 AI Query Domain Service & Natural Language Parser**
      `server/src/services/aiService.js` — natural language intent parsing (search, availability check, slot recommendation, FAQ),
      parameter extraction (capacity, resource type, date, times), integration with Resource & Availability engines,
      graceful keyword fallback, and structured output assembly.

- [x] **4.2 AI Validation Schemas**
      `server/src/validations/aiValidation.js` + Zod schemas for query input validation and structured output response envelope.

- [x] **4.3 AI Controller & Routes**
      `server/src/controllers/aiController.js`, `server/src/routes/aiRoutes.js` — `POST /api/v1/ai/query` endpoint with authentication,
      validation, mounted at `/api/v1/ai` in `server/src/app.js`.

- [x] **4.4 FastAPI Sidecar Microservice Architecture**
      `ai-service/app/main.py`, `ai-service/app/schemas/ai_schemas.py`, `ai-service/app/services/gemini_service.py`,
      `ai-service/app/routers/query.py`, `ai-service/requirements.txt` — Pydantic schemas and sidecar integration.

- [x] **4.5 AI Service & Route Verification Tests**
      `server/tests/ai_service.test.js`, `server/tests/ai_routes.test.js` — testing intent classification, regex fallback when Gemini key
      is absent, parameter extraction, and structured output formatting.

- [x] **4.6 Client AI Assistant Service & State**
      `client/src/services/aiService.js` — API call wrappers for AI query dispatching and response decoding.

- [x] **4.7 Client AI Assistant Chat Drawer UI**
      `client/src/components/AiAssistantDrawer.jsx` — floating expandable AI chat assistant with markdown bubble formatting,
      resource preview cards, recommended slot pills, and interactive quick action buttons (pre-filling `BookingModal`).

- [x] **4.8 Phase 4 Smoke test**
      `server/tests/phase4_smoke.test.js` — Jest + Supertest suite verifying natural language search queries, availability queries, fallback extraction,
      and prefill payload accuracy.

**Exit criteria for Phase 4:** Users can query in plain natural language (e.g. "I need a seminar hall for 100 people next Friday morning"),
receive ranked available facilities with open slots and actionable quick-booking chips, with 100% graceful degradation if AI APIs are offline.

---
Next up after this is approved: **Phase 5 — End-to-End Hardening, UI Polish, and Production Readiness.**
