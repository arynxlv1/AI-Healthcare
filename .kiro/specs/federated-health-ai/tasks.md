# Implementation Plan: Federated Health AI Platform

## Overview

Incremental implementation across seven phases: frontend build pipeline, backend startup, authentication, live database data, AI pipeline, FL WebSocket dashboard, and polish. Each task builds on the previous, ending with all components wired together.

## Tasks

- [x] 1. Fix frontend build pipeline and SPA routing
  - [x] 1.1 Verify and fix `frontend/src/index.css` Tailwind directives — already correct
  - [x] 1.2 Ensure `index.css` is imported in `frontend/src/main.tsx` — already correct
  - [x] 1.3 Verify `tailwind.config.js` content array — already correct
  - [x] 1.4 Verify `postcss.config.js` — already correct
  - [x] 1.5 Add `server.historyApiFallback: true` to `vite.config.ts`
  - [x] 1.6 Add `QueryClientProvider` to `main.tsx` (was missing — useQuery would crash)

- [x] 2. Fix backend startup and CORS
  - [x] 2.1 No broken `create_all` import found in `database.py` — already clean
  - [x] 2.2 Fix missing `audit` router import in `main.py`
  - [x] 2.3 CORS already correctly configured with `CORSMiddleware`

- [x] 3. Fix symptom vector encoder
  - [x] 3.1 Expand `mapping.py` to exactly 100 named symptoms
  - [x] 3.2 Order-independent, unknown-symptom-safe, always returns length 100

- [x] 4. Fix RBAC middleware
  - [x] 4.1 Updated `ROLES_PERMISSION` matrix to cover all routes
  - [x] 4.2 Added public path bypass for `/api/auth/login`, `/health`, `/`
  - [x] 4.3 Returns 401 for unauthenticated, 403 for wrong role
  - [x] 4.4 Fixed `log_action` call signature

- [x] 5. Fix audit router
  - [x] 5.1 Changed to `page`/`page_size` query params
  - [x] 5.2 Fixed `AuditLog.id` schema type (UUID string, not int)

- [x] 6. Fix FL router
  - [x] 6.1 Added role check on `/round/trigger` (hospital_admin only)

- [x] 7. Fix AI router
  - [x] 7.1 Fixed `strip_pii` import path
  - [x] 7.2 Added `PII_STRIPPED` audit log entry
  - [x] 7.3 Fixed SSE stream to properly prefix `data:` lines

- [x] 8. Fix PII stripper
  - [x] 8.1 Rewrote with correct pattern ordering (NHS before phone)
  - [x] 8.2 Added name-prefix patterns
  - [x] 8.3 Unified `services/pii_stripper.py` to re-export from middleware

- [x] 9. Fix WebSocket router
  - [x] 9.1 Added 30s heartbeat
  - [x] 9.2 Fixed async Redis cleanup on disconnect

- [x] 10. Frontend authentication
  - [x] 10.1 `authStore.ts` — already correct with Zustand persist
  - [x] 10.2 `ProtectedRoute` — already in `App.tsx`
  - [x] 10.3 `LoginPage.tsx` — fixed to decode JWT and store `hospital_id`
  - [x] 10.4 `AdminConsole.tsx` — fixed to use `page`/`page_size` params

- [x] 11. Error boundaries
  - [x] 11.1 Created `ErrorBoundary.tsx` component
  - [x] 11.2 Wrapped all four portals in `App.tsx`

- [x] 12. Mobile responsiveness
  - [x] 12.1 `PatientPortal` grid stacks vertically on all screen sizes, lg:col-span layout preserved

## Notes

- All TypeScript diagnostics: zero errors
- Symptom vector: 100 entries, order-independent, unknown-safe — verified
- PII stripper: email, phone, DOB, NHS, name-prefix — all verified
- Backend startup: no broken imports
- React Query provider added to main.tsx
