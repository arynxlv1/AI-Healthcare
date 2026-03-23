# Design Document: Federated Health AI Platform

## Overview

The Federated Health AI platform is a full-stack, privacy-preserving medical triage system. It enables AI-assisted diagnosis across multiple hospitals without centralizing patient data, using federated learning to train a shared ONNX model while keeping raw data local to each hospital.

The platform is organized into seven completion phases:

1. **Frontend Build Pipeline** — Tailwind CSS + Vite SPA routing fixes
2. **Backend Startup Integrity** — Import cleanup, CORS, and startup validation
3. **Real Authentication** — JWT-based login, RBAC enforcement, and frontend auth state
4. **Live Database Data** — All four portals consuming real database records
5. **Real AI Pipeline** — ONNX → RAG → LLM streaming with PII stripping
6. **Live FL Dashboard** — WebSocket-driven real-time federated learning progress
7. **Polish** — Loading states, error boundaries, mobile responsiveness

The codebase already has substantial scaffolding in place. This design focuses on completing, fixing, and wiring together the existing components rather than building from scratch.

---

## Architecture

```mermaid
graph TB
    subgraph Frontend ["Frontend (React + Vite + Tailwind)"]
        LP[LoginPage]
        PP[PatientPortal]
        DP[DoctorPortal]
        HD[HospitalDashboard]
        AC[AdminConsole]
        AS[AuthStore / Zustand]
    end

    subgraph Backend ["Backend (FastAPI)"]
        AUTH[/api/auth/login]
        AI[/api/ai/diagnose + stream]
        TRIAGE[/api/triage/queue + confirm + override]
        FL[/api/fl/status + trigger]
        AUDIT[/api/audit/logs]
        WS[/ws/fl/:hospital_id]
        RBAC[RBAC Middleware]
        PII[PIIStripper]
    end

    subgraph Services ["Backend Services"]
        ONNX[ONNXService]
        RAG[RAGService / PGVector]
        LLM[LLMService / Ollama]
        CELERY[CeleryWorker]
        AUDIT_SVC[AuditService]
    end

    subgraph Data ["Data Layer"]
        PG[(PostgreSQL / Supabase)]
        REDIS[(Redis)]
        MODEL[ml/model.onnx]
    end

    LP -->|POST credentials| AUTH
    AUTH -->|JWT + role| AS
    AS -->|Bearer token| RBAC
    RBAC --> AI & TRIAGE & FL & AUDIT & WS

    PP -->|symptoms| AI
    AI --> PII --> ONNX --> MODEL
    ONNX -->|prediction| RAG
    RAG --> LLM
    LLM -->|SSE tokens| PP

    DP -->|GET queue| TRIAGE
    TRIAGE --> PG
    TRIAGE --> AUDIT_SVC --> PG

    HD -->|GET status| FL
    HD -->|WebSocket| WS
    WS --> REDIS
    FL --> CELERY --> REDIS

    AC -->|GET logs| AUDIT
    AUDIT --> PG
```

### Key Architectural Decisions

**Two-phase AI pipeline**: The `/api/ai/diagnose` endpoint runs ONNX synchronously and returns a session ID. The frontend then opens a separate SSE stream (`/api/ai/diagnose/stream?session_id=...`) for the LLM reasoning. This decouples fast classification from slow generation and allows the UI to show the ONNX result immediately.

**App-level hospital isolation**: Supabase RLS policies enforce data isolation at the database layer. The backend also enforces `hospital_id` filtering at the application layer in the triage router, providing defense in depth.

**Redis as the FL event bus**: The Celery worker publishes FL round progress to Redis pub/sub channels. The WebSocket router subscribes to these channels and fans out to connected clients. This decouples the training process from the real-time UI.

**JWT as the single source of truth for identity**: The RBAC middleware reads `role` and `hospital_id` exclusively from the decoded JWT. No client-supplied headers are trusted for authorization decisions.

---

## Components and Interfaces

### Frontend Components

#### AuthStore (`frontend/src/store/authStore.ts`)
Zustand store persisted to `localStorage` via the `persist` middleware.

```typescript
interface AuthState {
  token: string | null;
  user: { email: string; role: string; hospital_id?: string } | null;
  setAuth: (token: string, user: {...}) => void;
  logout: () => void;
}
```

The `hospital_id` field must be decoded from the JWT payload and stored alongside `role` so portal components can use it without re-decoding the token.

#### Route Guard
A `ProtectedRoute` component wraps each portal route. It reads `token` from `AuthStore`; if absent, it redirects to `/`. It also checks that the authenticated role matches the route's required role.

#### LoginPage
Submits `application/x-www-form-urlencoded` to `/api/auth/login`. On success, calls `setAuth` with the token and decoded user object, then navigates to the role-appropriate portal.

#### PatientPortal
- Symptom input with Enter-key support and duplicate prevention
- Calls `POST /api/ai/diagnose` to get `session_id` and initial ONNX result
- Opens `EventSource` to `/api/ai/diagnose/stream?session_id=...` for streaming tokens
- Displays skeleton loader while streaming, cursor blink during generation
- React Query for assessment history (`GET /api/ai/history`)

#### DoctorPortal
- React Query for triage queue (`GET /api/triage/queue`)
- Skeleton loaders during fetch
- Confirm (`POST /api/triage/:id/confirm`) and Override (`POST /api/triage/:id/override`) mutations
- Override requires non-empty `doctor_notes`; button disabled otherwise
- Sonner toasts on success/error

#### HospitalDashboard
- React Query for FL status (`GET /api/fl/status`)
- WebSocket connection to `/ws/fl/:hospital_id` for live round updates
- Recharts `LineChart` updated on each `round_update` WebSocket event
- Reconnect logic on WebSocket close
- Trigger button calls `POST /api/fl/round/trigger`

#### AdminConsole
- React Query for audit logs (`GET /api/audit/logs?page=1&page_size=50`)
- Paginated table display

### Backend Routers

#### `POST /api/auth/login`
Accepts `OAuth2PasswordRequestForm`. Queries `User` by email, verifies bcrypt password, returns `{ access_token, token_type, role }`. The JWT payload includes `sub` (user id), `role`, `hospital_id`, and `exp`.

#### `POST /api/ai/diagnose`
1. Strips PII from `patient_query` via `PIIStripper`
2. Maps symptoms to 100-element vector via `map_symptoms_to_vector`
3. Runs `ONNXService.predict(vector)`
4. Creates `TriageSession` in DB
5. Returns `{ session_id, onnx_top_candidates }`

#### `GET /api/ai/diagnose/stream`
Accepts `session_id` query param. Streams SSE:
1. Loads `TriageSession` from DB
2. Calls `RAGService.search(symptom_text)`
3. Streams `LLMService.stream_reasoning(label, text, context_docs)`
4. Each chunk: `data: {"token": "...", "done": false}\n\n`
5. Final chunk: `data: {"token": "", "done": true}\n\n`

#### `GET /api/triage/queue`
Requires `doctor` role. Filters `TriageSession` by `hospital_id` from JWT. Returns list of triage cases.

#### `POST /api/triage/:id/confirm`
Requires `doctor` role. Sets `status = "confirmed"`. Writes `AuditLog`.

#### `POST /api/triage/:id/override`
Requires `doctor` role. Validates `note` is non-empty (min 5 chars). Sets `status = "overridden"`, `doctor_notes = note`. Writes `AuditLog`.

#### `GET /api/fl/status`
Returns latest `FLRound` record: `{ global_accuracy, rounds_completed, participating_hospitals, privacy_budget_consumed }`.

#### `POST /api/fl/round/trigger`
Requires `hospital_admin` role. Enqueues `trigger_fl_round_task` via Celery. Returns `{ task_id }`.

#### `GET /api/audit/logs`
Requires `admin`/`super_admin` role. Accepts `page` and `page_size` query params. Returns paginated `AuditLog` records ordered by `created_at DESC`.

#### `WS /ws/fl/:hospital_id`
Accepts WebSocket connections. Subscribes to `fl_updates_{hospital_id}` and `fl_updates_global` Redis channels. Forwards messages to the connected client. Heartbeat every 30s.

### Backend Services

#### `ONNXService`
- Loads `ml/model.onnx` at startup
- `encode_symptoms(symptoms: List[str]) -> List[float]`: maps against a fixed 100-symptom vocabulary
- `predict(vector: List[float]) -> Dict`: runs ONNX inference, returns top-5 predictions with probabilities and urgency level

#### `PIIStripper`
Regex-based stripping of email, phone, DOB, and NHS number patterns. Must be extended to cover name patterns (e.g., "Patient: [Name]" prefix patterns).

#### `RAGService`
- Primary: PGVector similarity search via `langchain_community`
- Fallback: keyword-overlap search against `scripts/synthetic_medical_kb.json`

#### `LLMService`
Streams from Ollama `/api/generate` endpoint. Constructs prompt from disease label, PII-stripped symptom text, and RAG context. Yields JSON-encoded token chunks.

#### `AuditService`
Writes `AuditLog` ORM records to the database. Never writes to files. Called after every triage status change and FL trigger.

### RBAC Middleware

The middleware runs on every request. It:
1. Extracts the `Authorization: Bearer <token>` header
2. Decodes the JWT via `AuthService.decode_token`
3. Stores `user_role`, `hospital_id`, and `user_id` in `request.state`
4. Checks the path against `ROLES_PERMISSION` matrix
5. Returns 401 if no valid JWT; 403 if role is not permitted

The `ROLES_PERMISSION` matrix needs to be updated to include all required paths:

```python
ROLES_PERMISSION = {
    "patient":        ["/api/auth", "/api/ai"],
    "doctor":         ["/api/auth", "/api/ai", "/api/triage"],
    "hospital_admin": ["/api/auth", "/api/fl", "/ws/fl"],
    "admin":          ["/api/auth", "/api/audit"],
    "super_admin":    ["*"],
}
```

---

## Data Models

### User
```
id: UUID (PK)
email: String (unique, indexed)
hashed_password: String (bcrypt)
full_name: String
role: Enum[patient, doctor, hospital_admin, admin, super_admin]
hospital_id: FK → hospitals.id (nullable for super_admin)
created_at: DateTime
```

### Hospital
```
id: String (PK, e.g. "HOSP_001")
name: String (unique)
location: String
api_key: String (unique, for FL client auth)
created_at: DateTime
```

### TriageSession
```
id: UUID (PK)
patient_id: FK → users.id
hospital_id: FK → hospitals.id
symptoms: JSON (List[str])
symptom_text: Text (PII-stripped)
onnx_predictions: JSON (List[{label, probability}])
urgency_level: Enum[high, medium, low]
llm_reasoning: Text
status: Enum[pending, confirmed, overridden]
doctor_id: FK → users.id (nullable)
doctor_notes: Text (nullable)
final_diagnosis: String (nullable)
created_at: DateTime
updated_at: DateTime
```

### FLRound
```
id: Integer (PK, auto-increment = round number)
global_accuracy: Float
participating_hospitals_count: Integer
epsilon_used: Float
model_version: String
config: JSON
created_at: DateTime
```

### AuditLog
```
id: UUID (PK)
user_id: FK → users.id
action: String (e.g. CONFIRM_TRIAGE, OVERRIDE_TRIAGE, TRIGGER_FL, PII_STRIPPED)
resource_type: String
resource_id: String (nullable)
details: JSON (nullable, must not contain PII)
ip_address: String (nullable)
created_at: DateTime
```

### Symptom Vocabulary (ONNXService)
The `map_symptoms_to_vector` function in `backend/app/core/mapping.py` currently has only 10 symptoms. It must be expanded to exactly 100 entries to match the ONNX model's expected input dimension. The vocabulary is a fixed ordered list; position in the list determines the vector index.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JWT Round Trip

*For any* valid user payload (containing `sub`, `role`, `hospital_id`), encoding it as a JWT and then decoding it with `AuthService.decode_token` should return a payload containing the same `sub`, `role`, and `hospital_id` values.

**Validates: Requirements 7.4**

---

### Property 2: Invalid JWT Returns None

*For any* string that is not a validly signed JWT (expired, tampered signature, or random bytes), `AuthService.decode_token` should return `None`.

**Validates: Requirements 7.5**

---

### Property 3: Login Rejects Invalid Credentials

*For any* email/password pair where the password does not match the stored bcrypt hash, the `/api/auth/login` endpoint should return HTTP 401.

**Validates: Requirements 7.2**

---

### Property 4: RBAC Rejects Unauthenticated Requests

*For any* protected endpoint path and any request that does not carry a valid JWT in the `Authorization` header, the RBAC middleware should return HTTP 401.

**Validates: Requirements 8.3**

---

### Property 5: RBAC Rejects Wrong-Role Requests

*For any* protected endpoint and any JWT whose `role` does not appear in that endpoint's allowed roles, the RBAC middleware should return HTTP 403.

**Validates: Requirements 8.4**

---

### Property 6: Role-Based Frontend Redirect

*For any* JWT role in `{patient, doctor, hospital_admin, admin}`, after a successful login the frontend should navigate to the corresponding portal route (`/patient`, `/doctor`, `/hospital`, `/admin`).

**Validates: Requirements 9.2, 9.3, 9.4, 9.5**

---

### Property 7: Unauthenticated Portal Access Redirects to Login

*For any* portal route (`/patient`, `/doctor`, `/hospital`, `/admin`) accessed without a valid token in `AuthStore`, the frontend should redirect to `/`.

**Validates: Requirements 9.6**

---

### Property 8: Triage Queue Hospital Isolation

*For any* doctor JWT with a given `hospital_id`, the `/api/triage/queue` endpoint should return only `TriageSession` records whose `hospital_id` matches the JWT claim — never records from other hospitals.

**Validates: Requirements 10.1**

---

### Property 9: Triage Override Requires Non-Empty Notes

*For any* override request where `doctor_notes` is empty or composed entirely of whitespace, the `/api/triage/:id/override` endpoint should return HTTP 422 and leave the `TriageSession` status unchanged.

**Validates: Requirements 10.3**

---

### Property 10: Triage Action Produces Audit Record

*For any* triage confirm or override action, after the action completes the `AuditLog` table should contain a new record referencing the affected `TriageSession` id and the acting user's id.

**Validates: Requirements 10.2, 12.4**

---

### Property 11: Audit Log Ordering

*For any* set of audit log records in the database, the `/api/audit/logs` endpoint should return them ordered by `created_at` descending — the most recent record first.

**Validates: Requirements 12.1**

---

### Property 12: Audit Log Pagination

*For any* total number of audit records N, page number P, and page size S, the `/api/audit/logs?page=P&page_size=S` endpoint should return exactly `min(S, N - (P-1)*S)` records corresponding to the correct slice of the full ordered result set.

**Validates: Requirements 12.2**

---

### Property 13: Symptom Vector Length Invariant

*For any* list of symptom strings (including empty lists, lists with unknown symptoms, and lists longer than the vocabulary), `map_symptoms_to_vector` should always return a list of exactly 100 float values.

**Validates: Requirements 13.2**

---

### Property 14: Symptom Encoding Order Independence

*For any* set of symptom strings, encoding them in any permutation should produce the identical 100-element float vector.

**Validates: Requirements 13.3**

---

### Property 15: Unknown Symptoms Are Silently Ignored

*For any* symptom string not present in the 100-symptom vocabulary, `map_symptoms_to_vector` should set all positions to 0.0 for that symptom and return without raising an exception.

**Validates: Requirements 13.4**

---

### Property 16: PII Stripping Removes All Identifier Patterns

*For any* text string containing one or more substrings matching email, phone number, date-of-birth, or NHS number patterns, `strip_pii` should return a string containing zero substrings that match any of those patterns.

**Validates: Requirements 14.6, 18.1, 18.2**

---

### Property 17: Audit Records Do Not Contain PII

*For any* diagnosis request that triggers PII stripping, the `details` field of the resulting `AuditLog` record should not contain any substring matching PII patterns (email, phone, DOB, NHS number).

**Validates: Requirements 18.3**

---

### Property 18: Passwords Stored as Bcrypt Hashes

*For any* user record in the database, the `hashed_password` field should be a valid bcrypt hash string (starting with `$2b$` or `$2a$`) and should never equal the plaintext password.

**Validates: Requirements 6.4**

---

## Error Handling

### Authentication Errors
- Missing or malformed `Authorization` header → RBAC middleware returns 401
- Expired JWT → `AuthService.decode_token` returns `None` → RBAC returns 401
- Invalid signature → same path as expired
- Wrong role for endpoint → RBAC returns 403 with descriptive message

### AI Pipeline Errors
- ONNX model file not found at startup → `ONNXService` logs a warning and sets `session = None`; `predict()` returns `{"error": "Model not loaded", "status": "fallback_triggered"}`
- Ollama connection refused → `LLMService` yields `{"error": "AI assistant temporarily unavailable", "type": "conn_error"}`
- Ollama read timeout → yields `{"error": "Response taking longer than expected", "type": "timeout"}`
- RAG/PGVector failure → falls back to keyword search against local JSON KB

### Database Errors
- Session not found in triage endpoints → 404
- Hospital ID mismatch → 403
- Empty override notes → 422 with validation detail
- DB commit failure in audit service → logs error, does not propagate (audit failure should not block the primary action)

### WebSocket Errors
- Redis connection failure → WebSocket closes; client displays last known values and retries
- WebSocket disconnect → server-side cleanup: unsubscribe from Redis channels, close connection

### Frontend Error Handling
- All React Query errors → Sonner toast with descriptive message
- Unhandled component errors → React Error Boundary renders fallback UI
- EventSource error → closes connection, sets `isStreaming = false`
- WebSocket close → sets `isConnected = false`, attempts reconnect with exponential backoff

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests verify specific examples, integration points, and edge cases
- Property tests verify universal invariants across many generated inputs

### Property-Based Testing

**Library**: `hypothesis` (Python) for backend; `fast-check` (TypeScript) for frontend.

Each property test must run a minimum of 100 iterations. Tests are tagged with a comment referencing the design property:

```
# Feature: federated-health-ai, Property N: <property_text>
```

**Backend property tests** (`backend/tests/test_properties.py`):

| Property | Test Description |
|---|---|
| P1: JWT Round Trip | Generate random payloads, encode then decode, assert equality |
| P2: Invalid JWT Returns None | Generate random strings/tampered tokens, assert decode returns None |
| P3: Login Rejects Invalid Credentials | Generate random wrong passwords, assert 401 |
| P4: RBAC Rejects Unauthenticated | Generate random protected paths, assert 401 without JWT |
| P5: RBAC Rejects Wrong Role | Generate role/path pairs where role is not permitted, assert 403 |
| P8: Triage Queue Hospital Isolation | Generate sessions across hospitals, assert queue only returns own hospital |
| P9: Override Requires Notes | Generate empty/whitespace note strings, assert 422 |
| P10: Triage Action Produces Audit | Generate triage actions, assert audit log count increases |
| P11: Audit Log Ordering | Insert N logs with random timestamps, assert descending order |
| P12: Audit Log Pagination | Generate N logs, assert correct slice for random page/page_size |
| P13: Symptom Vector Length | Generate random symptom lists, assert len(vector) == 100 |
| P14: Encoding Order Independence | Generate random symptom sets, shuffle, assert identical vectors |
| P15: Unknown Symptoms Ignored | Generate random non-vocabulary strings, assert no exception, all zeros |
| P16: PII Stripping | Generate strings with embedded PII patterns, assert none remain after strip |
| P17: Audit Records No PII | Generate diagnosis requests with PII, assert audit details are clean |
| P18: Passwords as Bcrypt Hashes | Generate random passwords, hash them, assert bcrypt format |

**Frontend property tests** (`frontend/src/tests/properties.test.ts`):

| Property | Test Description |
|---|---|
| P6: Role-Based Redirect | For each role string, assert `routes[role]` maps to correct path |
| P7: Unauthenticated Redirect | For any portal path, assert ProtectedRoute redirects when token is null |

### Unit Tests

**Backend unit tests** (`backend/tests/test_unit.py`):
- `AuthService.verify_password` with known hash/password pairs
- `AuthService.create_access_token` includes correct claims
- `strip_pii` with specific PII examples (email, phone, DOB, NHS)
- `ONNXService.predict` with a known symptom vector returns expected shape
- `AuditService.log_action` inserts a record (using test DB)
- `TriageRouter` confirm endpoint updates status to "confirmed"
- `FLRouter` status endpoint returns correct structure when no rounds exist
- `AuditRouter` logs endpoint returns empty list when no logs exist

**Frontend unit tests** (`frontend/src/tests/unit.test.ts`):
- `AuthStore.setAuth` stores token and user
- `AuthStore.logout` clears token and user
- `LoginPage` renders email and password fields
- `DoctorPortal` override button is disabled when notes are empty

### Integration Tests

- Full login flow: POST credentials → receive JWT → decode role → navigate to portal
- Full triage flow: POST symptoms → get session_id → stream SSE → confirm case → verify audit log
- FL trigger flow: POST trigger → verify Celery task enqueued → verify Redis publish
- WebSocket flow: connect → publish Redis event → assert message received by client
