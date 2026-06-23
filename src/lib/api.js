const APP_ID = import.meta.env.VITE_APP_ID || '6a262ce8fe5781a4fc436536';
const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const APP_API = `/api/apps/${APP_ID}`;

function authPath(path) {
  return `${APP_API}/auth/${path}`;
}

function entityPath(entityName, id = '') {
  return `${APP_API}/entities/${entityName}${id ? `/${id}` : ''}`;
}

function integrationPath(name) {
  return `${APP_API}/integration-endpoints/Core/${name}`;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
}

export function logout() {
  localStorage.removeItem('token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    logout();
    window.location.href = '/login';
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `API error: ${res.status}`);
    error.status = res.status;
    error.code = err.code;
    error.needsVerification = Boolean(err.needsVerification);
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function login(email, password) {
  const data = await apiFetch(authPath('login'), {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data?.access_token || data?.token);
  return data;
}

export async function register({ email, password, name, full_name, role }) {
  return apiFetch(authPath('register'), {
    method: 'POST',
    body: JSON.stringify({ email, password, name, full_name, role }),
  });
}

export async function verifyOtp({ email, otpCode }) {
  return apiFetch(authPath('verify-otp'), {
    method: 'POST',
    body: JSON.stringify({ email, otp_code: otpCode }),
  });
}

export function resendOtp(email) {
  return apiFetch(authPath('resend-otp'), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordRequest(email) {
  return apiFetch(authPath('reset-password-request'), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword({ resetToken, newPassword }) {
  return apiFetch(authPath('reset-password'), {
    method: 'POST',
    body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
  });
}

export function getCurrentUser() {
  if (!getToken()) return null;
  return apiFetch(entityPath('User', 'me'));
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

function listEntity(entityName, sort, limit, skip) {
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (limit != null) params.set('limit', String(limit));
  if (skip != null) params.set('skip', String(skip));
  const qs = params.toString();
  return api.get(`${entityPath(entityName)}${qs ? `?${qs}` : ''}`);
}

function filterEntity(entityName, query, sort, limit, skip) {
  const params = new URLSearchParams();
  if (query && Object.keys(query).length > 0) params.set('q', JSON.stringify(query));
  if (sort) params.set('sort', sort);
  if (limit != null) params.set('limit', String(limit));
  if (skip != null) params.set('skip', String(skip));
  const qs = params.toString();
  return api.get(`${entityPath(entityName)}${qs ? `?${qs}` : ''}`);
}

function entityApi(entityName) {
  return {
    list: (sort, limit, skip) => listEntity(entityName, sort, limit, skip),
    filter: (query, sort, limit, skip) => filterEntity(entityName, query, sort, limit, skip),
    create: (data) => api.post(entityPath(entityName), data),
    update: (id, data) => api.put(entityPath(entityName, id), data),
    delete: (id) => api.delete(entityPath(entityName, id)),
  };
}

export const entities = {
  User: entityApi('User'),
  InspectionSession: entityApi('InspectionSession'),
  InspectionPhoto: entityApi('InspectionPhoto'),
  AuditLog: entityApi('AuditLog'),
};

export const inspectionSessions = {
  submit: (id) => api.post(`/api/inspection-sessions/${id}/submit`, {}),
  verify: (id, decision, adminComment = '') => api.post(`/api/inspection-sessions/${id}/verify`, {
    decision,
    admin_comment: adminComment,
  }),
};

export async function createAndSubmitInspection(sessionData, photos) {
  const session = await entities.InspectionSession.create(sessionData);
  for (const photo of photos) {
    await entities.InspectionPhoto.create({ ...photo, session_id: session.id });
  }
  return inspectionSessions.submit(session.id);
}

async function uploadFile({ file }) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(integrationPath('UploadFile'), {
    method: 'POST',
    body: formData,
  });
}

function invokeLLM(payload) {
  return api.post(integrationPath('InvokeLLM'), payload);
}

export const integrations = {
  Core: {
    UploadFile: uploadFile,
    InvokeLLM: invokeLLM,
  },
};
