const BASE_URL = import.meta.env.VITE_API_URL || '';

export function getAccessToken() {
  return localStorage.getItem('fk_access_token');
}

export function getRefreshToken() {
  return localStorage.getItem('fk_refresh_token');
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('fk_access_token', accessToken);
  localStorage.setItem('fk_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('fk_access_token');
  localStorage.removeItem('fk_refresh_token');
}

// Un seul rafraîchissement à la fois : sans ce verrou, plusieurs requêtes qui
// tombent en 401 en même temps lanceraient chacune un /auth/refresh. Or le
// serveur fait tourner (rotation) le refresh token : le 1er réussit et révoque
// l'ancien, les suivants envoient un token déjà révoqué -> échec qui efface les
// jetons tout juste renouvelés. On partage donc la même promesse de refresh.
let refreshEnCours = null;

function tryRefresh() {
  if (!refreshEnCours) {
    refreshEnCours = doRefresh();
  }
  return refreshEnCours;
}

async function doRefresh() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      window.location.replace('/login');
      throw new Error('Session expirée');
    }
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      window.location.replace('/login');
      throw new Error('Session expirée');
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } finally {
    // On libère le verrou une fois le refresh terminé (succès ou échec).
    refreshEnCours = null;
  }
}

async function request(path, options = {}, retry = true) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    await tryRefresh();
    return request(path, options, false);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Erreur HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email, motDePasse) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse }),
    }),
  me: () => request('/auth/me'),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    }).catch(() => null),
};

// ─── PAYS / CONSOLIDATION ────────────────────────────────────────────────────

export const paysApi = {
  liste: () => request('/api/pays'),

  lots: (code) =>
    code ? request(`/api/pays/${code}/lots`) : request('/api/lots'),

  alertes: (code) =>
    code ? request(`/api/pays/${code}/alertes`) : request('/api/alertes'),

  mesuresEntrepot: (code, entrepotId) =>
    request(`/api/pays/${code}/entrepots/${entrepotId}/mesures`),

  exploitations: (code) => request(`/api/pays/${code}/exploitations`),

  entrepots: (code, expId) =>
    request(`/api/pays/${code}/exploitations/${expId}/entrepots`),

  capteurs: (code, entrepotId) =>
    request(`/api/pays/${code}/entrepots/${entrepotId}/capteurs`),

  acquitterAlerte: (code, id) =>
    request(`/api/pays/${code}/alertes/${id}/acquitter`, { method: 'PATCH' }),

  resoudreAlerte: (code, id) =>
    request(`/api/pays/${code}/alertes/${id}/resoudre`, { method: 'PATCH' }),

  creerLot: (code, lot) =>
    request(`/api/pays/${code}/lots`, {
      method: 'POST',
      body: JSON.stringify(lot),
    }),

  modifierLot: (code, id, data) =>
    request(`/api/pays/${code}/lots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  supprimerLot: (code, id) =>
    request(`/api/pays/${code}/lots/${id}`, { method: 'DELETE' }),
};

// ─── USERS ───────────────────────────────────────────────────────────────────

export const usersApi = {
  liste: () => request('/users'),
  creer: (data) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  desactiver: (id) =>
    request(`/users/${id}/desactiver`, { method: 'PATCH' }),
  activer: (id) =>
    request(`/users/${id}/activer`, { method: 'PATCH' }),
  changerRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  modifier: (id, data) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  supprimer: (id) =>
    request(`/users/${id}`, { method: 'DELETE' }),
};

// ─── AUDIT ───────────────────────────────────────────────────────────────────

export const auditApi = {
  consulter: () => request('/audit'),
};

// ─── UTILITAIRES ─────────────────────────────────────────────────────────────

export const PAYS_CODES = {
  brazil: 'BRESIL',
  ecuador: 'EQUATEUR',
  colombia: 'COLOMBIE',
};

export function toBackendCode(frontendId) {
  return PAYS_CODES[frontendId] || null;
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}
