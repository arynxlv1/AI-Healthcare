import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export interface Prediction {
  label: string;
  probability: number;
  percentage: number;
}

export interface OnnxResult {
  predictions: Prediction[];
  urgency: string;
  risk_level: string;
  immediate_steps: string[];
  latency_ms: number;
}

export interface DiagnoseResponse {
  session_id: string;
  onnx_top_candidates: OnnxResult;
  status: string;
}

export interface TriageCase {
  id: string;
  patient_id: string;
  hospital_id: string;
  urgency: string;
  symptoms: string[];
  ai_diagnosis: string;
  status: string;
}

export interface FLStatus {
  accuracy: number;
  current_round: number;
  total_rounds: number;
  clients: number;
  privacy_budget: string;
  history: { round: number; accuracy: number; loss: number; clients: number }[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  symptoms: string[];
  urgency_level: string | null;
  onnx_predictions: Prediction[] | null;
  status: string;
  created_at: string;
}

export interface OllamaStatus {
  online: boolean;
  models: string[];
  active_model: string;
}

// ── Axios instance ─────────────────────────────────────────────────────────

const api = axios.create({ baseURL: '/' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && url.includes('/api/auth/')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Typed helpers ──────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    }).then((r) => {
      if (!r.ok) throw new Error('Invalid credentials');
      return r.json() as Promise<LoginResponse>;
    }),
};

export const aiApi = {
  diagnose: (symptoms: string[], hospital_id: string, patient_query?: string) =>
    api.post<DiagnoseResponse>('/api/ai/diagnose', { symptoms, hospital_id, patient_query }).then((r) => r.data),

  history: () => api.get<HistoryItem[]>('/api/ai/history').then((r) => r.data),

  ollamaStatus: () => api.get<OllamaStatus>('/api/ai/ollama/status').then((r) => r.data),
};

export const triageApi = {
  queue: () => api.get<TriageCase[]>('/api/triage/queue').then((r) => r.data),
  confirm: (id: string) => api.post(`/api/triage/${id}/confirm`).then((r) => r.data),
  override: (id: string, note: string) =>
    api.post(`/api/triage/${id}/override?note=${encodeURIComponent(note)}`).then((r) => r.data),
};

export const flApi = {
  status: () => api.get<FLStatus>('/api/fl/status').then((r) => r.data),
  trigger: () => api.post('/api/fl/trigger').then((r) => r.data),
};

export const auditApi = {
  logs: (page = 1, page_size = 50) =>
    api.get<AuditLog[]>('/api/audit/logs', { params: { page, page_size } }).then((r) => r.data),
};
