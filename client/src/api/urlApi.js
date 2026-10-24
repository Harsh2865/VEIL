const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint, options = {}, clientId = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (clientId) {
    headers['X-Client-Id'] = clientId;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errorObj = typeof data === 'object' && data?.error
        ? data.error
        : {
            code: res.status === 429 ? 'RATE_LIMITED' : 'API_ERROR',
            message: typeof data === 'string' && data ? data : `Request failed with status ${res.status}`,
          };
      const error = new Error(errorObj.message);
      error.code = errorObj.code;
      error.status = res.status;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    if (err.code && err.status) {
      throw err;
    }
    const networkError = new Error('Unable to connect to the URL Shortener service. Please check your network connection.');
    networkError.code = 'NETWORK_ERROR';
    networkError.status = 0;
    throw networkError;
  }
}

export async function shortenUrl({ url, customCode, label }, clientId) {
  const payload = { url };
  if (customCode && customCode.trim()) {
    payload.customCode = customCode.trim();
  }
  if (label && label.trim()) {
    payload.label = label.trim();
  }

  return request('/api/urls', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, clientId);
}

export async function fetchHistory({ limit = 20, cursor = null } = {}, clientId, options = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (cursor) params.set('cursor', cursor);

  const qs = params.toString();
  return request(`/api/urls${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    ...options,
  }, clientId);
}

export async function deleteUrl(id, clientId) {
  return request(`/api/urls/${id}`, {
    method: 'DELETE',
  }, clientId);
}

export async function checkCodeAvailability(code) {
  return request(`/api/codes/${encodeURIComponent(code.trim())}/available`, {
    method: 'GET',
  });
}

export async function checkHealth() {
  return request('/api/health', {
    method: 'GET',
  });
}
