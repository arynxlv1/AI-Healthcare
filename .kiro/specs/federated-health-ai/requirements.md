# Requirements Document

## Introduction

This document defines the requirements for completing the Federated Health AI platform — a full-stack system that enables privacy-preserving AI-assisted medical triage across multiple hospitals using federated learning. The platform consists of four role-based portals (Patient, Doctor, Hospital Admin, System Admin), a FastAPI backend, an ONNX-based symptom classifier, a Llama 3.1 LLM for streaming diagnosis reasoning, a federated learning pipeline, and a real-time WebSocket dashboard. The work is organized into seven phases: frontend rendering fixes, backend startup fixes, real authentication, live database data in all portals, a real AI pipeline, a live FL dashboard, and final polish.

## Glossary

- **Platform**: The complete Federated Health AI system comprising frontend, backend, ML pipeline, and FL infrastructure.
- **Frontend**: The React + TypeScript + Vite + Tailwind CSS single-page application in `frontend/`.
- **Backend**: The FastAPI + SQLAlchemy + Celery application in `backend/`.
- **PatientPortal**: The React page at `/patient` used by patients to enter symptoms and receive AI-assisted diagnoses.
- **DoctorPortal**: The React page at `/doctor` used by doctors to review and act on triage cases.
- **HospitalDashboard**: The React page at `/hospital` used by hospital administrators to monitor federated learning rounds.
- **AdminConsole**: The React page at `/admin` used by system administrators to review audit logs.
- **LoginPage**: The React page at `/` (root) that authenticates users and redirects them to the correct portal.
- **AuthService**: The backend service in `backend/app/services/auth_service.py` responsible for JWT creation and verification and bcrypt password checking.
- **RBAC**: Role-based access control middleware in `backend/app/middleware/rbac.py` that enforces per-role endpoint access.
- **TriageRouter**: The FastAPI router in `backend/app/routers/triage.py` that manages triage session queuing and status updates.
- **FLRouter**: The FastAPI router in `backend/app/routers/fl.py` that exposes federated learning status and trigger endpoints.
- **AuditRouter**: The FastAPI router in `backend/app/routers/audit.py` that exposes paginated audit log queries.
- **AIRouter**: The FastAPI router in `backend/app/routers/ai.py` that handles symptom encoding, ONNX inference, RAG retrieval, and LLM streaming.
- **WSRouter**: The FastAPI router in `backend/app/routers/ws.py` that manages WebSocket connections for real-time FL progress.
- **AuditService**: The backend service in `backend/app/services/audit_service.py` that persists audit records.
- **ONNXService**: The backend service in `backend/app/services/onnx_service.py` that runs the ONNX symptom classifier.
- **RAGService**: The backend service in `backend/app/services/rag_service.py` that retrieves relevant medical context documents.
- **LLMService**: The backend service in `backend/app/services/llm_service.py` that streams tokens from the local Llama 3.1 model via Ollama.
- **PIIStripper**: The middleware/service in `backend/app/middleware/pii_stripper.py` that removes patient identifiers before they reach the LLM.
- **AuthStore**: The Zustand store in `frontend/src/store/authStore.ts` that holds the JWT and decoded user role on the client.
- **SymptomVector**: A fixed-length binary float vector of length 100 encoding the presence or absence of named symptoms.
- **FLRound**: An ORM model representing one round of federated learning, including round number, participating hospitals, and accuracy metrics.
- **TriageSession**: An ORM model representing a single patient triage event, including symptoms, ONNX prediction, doctor notes, status, and audit trail.
- **AuditLog**: An ORM model representing a single immutable audit record linked to a user action and a triage session or FL event.
- **CeleryWorker**: The background task worker in `backend/app/worker.py` that executes FL training tasks asynchronously.
- **RedisChannel**: The Redis pub/sub channel used to broadcast FL round progress events to connected WebSocket clients.
- **SSE**: Server-Sent Events — the HTTP streaming mechanism used by the AI diagnosis endpoint to push LLM tokens to the browser.
- **Supabase**: The hosted PostgreSQL + auth service used as the production database.
- **RLS**: Row-Level Security policies applied in Supabase to enforce per-hospital data isolation.

## Requirements

### Requirement 1: Frontend Build Pipeline

**User Story:** As a developer, I want the Tailwind CSS build pipeline to process all source files correctly, so that the application renders with the intended glassmorphism design system.

#### Acceptance Criteria

1. THE Frontend SHALL include `@tailwind base`, `@tailwind components`, and `@tailwind utilities` directives in `frontend/src/index.css`.
2. THE Frontend SHALL import `index.css` in `frontend/src/main.tsx` before any component is rendered.
3. THE Frontend SHALL include a `tailwind.config.js` with a `content` array that covers all `.tsx` and `.ts` files under `frontend/src/`.
4. THE Frontend SHALL include a `postcss.config.js` that registers the `tailwindcss` and `autoprefixer` plugins.
5. WHEN the Vite dev server starts, THE Frontend SHALL apply Tailwind utility classes to all rendered components without requiring a manual cache clear.

---

### Requirement 2: Vite SPA Routing

**User Story:** As a user, I want direct URL navigation and page refresh to work on all portal routes, so that I am not presented with a 404 error when accessing a deep link.

#### Acceptance Criteria

1. THE Frontend SHALL configure `server.historyApiFallback: true` in `vite.config.ts`.
2. WHEN a browser navigates directly to `/patient`, `/doctor`, `/hospital`, or `/admin`, THE Frontend SHALL serve `index.html` and render the correct portal component.
3. WHEN a browser refreshes any portal route, THE Frontend SHALL re-render the correct portal without a 404 response.

---

### Requirement 3: Portal Visual Completeness

**User Story:** As a stakeholder, I want all four role-based portals to render with the glassmorphism design system, so that the application looks professional and consistent.

#### Acceptance Criteria

1. WHEN a user navigates to `/patient`, THE PatientPortal SHALL render with glassmorphism card styles applied via Tailwind utility classes.
2. WHEN a user navigates to `/doctor`, THE DoctorPortal SHALL render with glassmorphism card styles applied via Tailwind utility classes.
3. WHEN a user navigates to `/hospital`, THE HospitalDashboard SHALL render with glassmorphism card styles applied via Tailwind utility classes.
4. WHEN a user navigates to `/admin`, THE AdminConsole SHALL render with glassmorphism card styles applied via Tailwind utility classes.
5. WHEN a user navigates to `/`, THE LoginPage SHALL render as a card-based UI with Tailwind styles applied.

---

### Requirement 4: Backend Startup Integrity

**User Story:** As a developer, I want the FastAPI backend to start without import errors, so that I can run the server and begin development.

#### Acceptance Criteria

1. THE Backend SHALL not contain any import of `create_all` from `sqlalchemy` in `backend/app/core/database.py`.
2. WHEN `uvicorn app.main:app --reload` is executed, THE Backend SHALL reach the `Application startup complete` log line with no Python exceptions.
3. IF a Python import error occurs during startup, THEN THE Backend SHALL print the full traceback and exit with a non-zero status code.

---

### Requirement 5: CORS Configuration

**User Story:** As a frontend developer, I want the backend to accept requests from the Vite dev server origins, so that the browser console shows no CORS errors during development.

#### Acceptance Criteria

1. THE Backend SHALL register `fastapi.middleware.cors.CORSMiddleware` in `backend/app/main.py`.
2. THE Backend SHALL configure `CORSMiddleware` to allow origins `http://localhost:5173` and `http://localhost:3000`.
3. THE Backend SHALL configure `CORSMiddleware` to allow credentials, all standard HTTP methods, and all headers.
4. WHEN the Frontend makes an API request to the Backend, THE Backend SHALL include the correct `Access-Control-Allow-Origin` header in the response.
5. IF the Backend receives a preflight OPTIONS request, THEN THE Backend SHALL respond with status 200 and the correct CORS headers.

---

### Requirement 6: Database Migration and Seeding

**User Story:** As a developer, I want the database schema and seed data to be applied to Supabase, so that the application has a working data foundation for all four roles.

#### Acceptance Criteria

1. WHEN `alembic upgrade head` is run against the Supabase connection string, THE Backend SHALL apply all pending migrations without error.
2. WHEN `supabase_rls_policies.sql` is executed against Supabase, THE Backend SHALL enforce per-hospital row-level security on all patient data tables.
3. WHEN `scripts/seed_db.py` is executed, THE Backend SHALL create at least one user for each of the four roles (patient, doctor, hospital_admin, admin), at least four hospital records, and at least one sample TriageSession.
4. FOR ALL seeded user passwords, THE Backend SHALL store bcrypt hashes and never store plaintext passwords.

---

### Requirement 7: Real JWT Authentication

**User Story:** As a user, I want to log in with my credentials and receive a JWT that grants access to my role-specific portal, so that the system enforces proper access control.

#### Acceptance Criteria

1. WHEN a POST request is made to `/auth/login` with valid credentials, THE AuthService SHALL query the database for the user, verify the password with bcrypt, and return a signed JWT containing the user's `id`, `role`, and `hospital_id`.
2. WHEN a POST request is made to `/auth/login` with invalid credentials, THE Backend SHALL return HTTP 401 with a descriptive error message.
3. THE AuthService SHALL sign JWTs using a secret key loaded from environment configuration, not hardcoded in source.
4. WHEN a JWT is decoded by `AuthService.decode_token()`, THE AuthService SHALL return the payload if the signature is valid and the token has not expired.
5. IF a JWT is expired or has an invalid signature, THEN THE AuthService SHALL raise an exception that causes the Backend to return HTTP 401.

---

### Requirement 8: JWT-Based RBAC

**User Story:** As a security engineer, I want role enforcement to read from the JWT rather than a client-supplied header, so that users cannot escalate their own privileges.

#### Acceptance Criteria

1. THE RBAC middleware SHALL extract the user role exclusively from the decoded JWT in the `Authorization: Bearer <token>` header.
2. THE RBAC middleware SHALL not read role information from any HTTP header supplied by the client.
3. WHEN a request arrives without a valid JWT, THE RBAC middleware SHALL return HTTP 401.
4. WHEN a request arrives with a JWT whose role does not match the required role for the endpoint, THE RBAC middleware SHALL return HTTP 403.

---

### Requirement 9: Frontend Authentication State

**User Story:** As a user, I want my login session to persist in the browser and redirect me to the correct portal, so that I do not have to re-enter my credentials on every page load.

#### Acceptance Criteria

1. WHEN a successful login response is received, THE AuthStore SHALL store the JWT string and the decoded role in Zustand state.
2. WHEN the role in the JWT is `patient`, THE Frontend SHALL redirect the user to `/patient`.
3. WHEN the role in the JWT is `doctor`, THE Frontend SHALL redirect the user to `/doctor`.
4. WHEN the role in the JWT is `hospital_admin`, THE Frontend SHALL redirect the user to `/hospital`.
5. WHEN the role in the JWT is `admin`, THE Frontend SHALL redirect the user to `/admin`.
6. WHEN an unauthenticated user navigates to any portal route, THE Frontend SHALL redirect the user to the LoginPage.
7. WHEN a user logs out, THE AuthStore SHALL clear the JWT and role, and THE Frontend SHALL redirect the user to the LoginPage.

---

### Requirement 10: Triage Queue — Real Data

**User Story:** As a doctor, I want the triage queue to show real cases from the database filtered to my hospital, so that I can act on actual patient data.

#### Acceptance Criteria

1. WHEN the TriageRouter queue endpoint is called with a valid doctor JWT, THE TriageRouter SHALL return only TriageSession records whose `hospital_id` matches the `hospital_id` claim in the JWT.
2. WHEN a doctor submits a status update with non-empty `doctor_notes`, THE TriageRouter SHALL update the TriageSession status in the database and write an AuditLog record.
3. IF a doctor submits a status update with empty `doctor_notes`, THEN THE TriageRouter SHALL return HTTP 422 with a validation error.
4. WHEN the DoctorPortal loads, THE DoctorPortal SHALL fetch triage cases using React Query and display them without mock data.

---

### Requirement 11: Federated Learning Status — Real Data

**User Story:** As a hospital administrator, I want the FL status panel to reflect real round data from the database, so that I can monitor training progress accurately.

#### Acceptance Criteria

1. WHEN the FLRouter status endpoint is called, THE FLRouter SHALL query the FLRound table and return the latest round number, participating hospital count, and accuracy metrics.
2. WHEN the FLRouter trigger endpoint is called by an authorized hospital_admin, THE FLRouter SHALL enqueue a Celery task on the CeleryWorker and return the task ID.
3. WHEN the HospitalDashboard loads, THE HospitalDashboard SHALL fetch FL status using React Query and display real round data without mock values.

---

### Requirement 12: Audit Log — Real Data

**User Story:** As a system administrator, I want the audit log to show real records from the database with pagination, so that I can review all system activity.

#### Acceptance Criteria

1. WHEN the AuditRouter logs endpoint is called, THE AuditRouter SHALL query the AuditLog table and return records ordered by timestamp descending.
2. THE AuditRouter logs endpoint SHALL accept `page` and `page_size` query parameters and return the correct slice of records.
3. WHEN the AdminConsole loads, THE AdminConsole SHALL fetch audit records using React Query and display them without mock data.
4. WHEN any triage status update or FL trigger occurs, THE AuditService SHALL insert a new AuditLog record into the database using the AuditLog ORM model.
5. THE AuditService SHALL not write audit records to a JSON file.

---

### Requirement 13: Symptom Vector Encoding

**User Story:** As a developer, I want the symptom encoder to produce a deterministic fixed-length vector, so that the ONNX model receives consistent input regardless of symptom order.

#### Acceptance Criteria

1. THE ONNXService SHALL maintain a fixed vocabulary list of at least 100 named symptoms.
2. WHEN a list of symptom names is provided to the encoder, THE ONNXService SHALL produce a binary float vector of exactly length 100 where each position is 1.0 if the symptom is present and 0.0 otherwise.
3. FOR ALL valid symptom name lists, encoding the same set of symptoms in any order SHALL produce the identical SymptomVector (order-independence property).
4. WHEN a symptom name not in the vocabulary is provided, THE ONNXService SHALL set the corresponding vector position to 0.0 and continue without raising an exception.

---

### Requirement 14: AI Diagnosis Pipeline

**User Story:** As a patient, I want to enter my symptoms and receive an AI-generated diagnosis with reasoning, so that I can understand my potential condition before seeing a doctor.

#### Acceptance Criteria

1. WHEN the AIRouter stream endpoint receives a symptom list, THE AIRouter SHALL first run the ONNXService to obtain the top prediction label within 1 second.
2. WHEN the ONNX prediction is complete, THE AIRouter SHALL invoke the RAGService to retrieve relevant context documents for the predicted label.
3. WHEN the RAG retrieval is complete, THE AIRouter SHALL pass the symptom list, ONNX prediction label, and RAG context documents to the LLMService.
4. THE LLMService SHALL stream response tokens from the local Llama 3.1 model via Ollama using Server-Sent Events.
5. WHEN the PatientPortal connects to the stream endpoint, THE PatientPortal SHALL use a real `EventSource` connection and render each token as it arrives.
6. THE PIIStripper SHALL process the prompt before it is sent to the LLMService and remove all patient identifiers.
7. FOR ALL diagnosis requests, the prompt logged or sent to Ollama SHALL contain zero patient identifiers (privacy invariant).

---

### Requirement 15: FL Live WebSocket Dashboard

**User Story:** As a hospital administrator, I want the dashboard to update in real time during a federated learning simulation, so that I can monitor round-by-round progress without refreshing the page.

#### Acceptance Criteria

1. THE WSRouter SHALL expose a WebSocket endpoint that accepts connections from authenticated hospital_admin users.
2. WHEN a WebSocket client connects, THE WSRouter SHALL subscribe to the RedisChannel for FL progress events.
3. WHEN a FL progress event is published to the RedisChannel, THE WSRouter SHALL forward the event payload to all connected WebSocket clients within 500ms.
4. WHEN the HospitalDashboard mounts, THE HospitalDashboard SHALL open a WebSocket connection and update accuracy and round number displays as events arrive.
5. WHEN the WebSocket connection closes, THE HospitalDashboard SHALL display the last known values and attempt to reconnect.
6. WHEN `ml/simulate_fl.py` is running and the HospitalDashboard is open, THE HospitalDashboard SHALL reflect each new FL round result without a page refresh.

---

### Requirement 16: Loading and Error States

**User Story:** As a user, I want every portal to show loading indicators and meaningful error messages, so that I always know the state of the application.

#### Acceptance Criteria

1. WHEN a triage queue fetch is in progress, THE DoctorPortal SHALL display a skeleton loader in place of the triage list.
2. WHEN an FL status fetch is in progress, THE HospitalDashboard SHALL display a skeleton loader in place of the accuracy metrics.
3. WHEN the LLM is generating a response, THE PatientPortal SHALL display a thinking animation in the reasoning panel.
4. WHEN any API call returns an error, THE Frontend SHALL display a Sonner toast notification with a descriptive error message.
5. WHEN a triage status update succeeds, THE Frontend SHALL display a Sonner toast notification confirming the action.
6. WHEN a doctor override is submitted, THE Frontend SHALL display a Sonner toast notification confirming the override.
7. WHEN a portal component throws an unhandled JavaScript error, THE Frontend SHALL render a React error boundary fallback UI instead of a blank screen.

---

### Requirement 17: Mobile Responsiveness

**User Story:** As a patient on a mobile device, I want the patient portal to be usable on a small screen, so that I can access the diagnosis feature from my phone.

#### Acceptance Criteria

1. WHEN the PatientPortal is rendered on a viewport narrower than 640px, THE PatientPortal SHALL stack all layout sections vertically.
2. WHEN the PatientPortal is rendered on a viewport narrower than 640px, THE PatientPortal SHALL not render any horizontally overflowing content.
3. WHILE the viewport width is 640px or greater, THE PatientPortal SHALL maintain its standard multi-column layout.

---

### Requirement 18: Privacy Audit

**User Story:** As a compliance officer, I want to verify that no patient identifiers are passed to the LLM, so that the platform meets healthcare privacy requirements.

#### Acceptance Criteria

1. WHEN a diagnosis is triggered, THE PIIStripper SHALL strip all fields matching patterns for names, phone numbers, email addresses, and date-of-birth before constructing the Ollama prompt.
2. FOR ALL diagnosis requests, the Ollama prompt logged by the Backend SHALL contain zero strings matching PII patterns (privacy invariant).
3. THE AuditService SHALL log the fact that PII stripping was applied to each diagnosis request without logging the original PII values.
