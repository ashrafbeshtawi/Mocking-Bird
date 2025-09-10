const fetchWithAuth = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)
      ? options.headers as Record<string, string>
      : {}),
  };

  // If body is a plain object, send as JSON
  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData)
  ) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  // If body is FormData, do not set Content-Type (browser will handle)
  if (options.body instanceof FormData) {
    // Remove Content-Type if present
    if ('Content-Type' in headers) {
      delete headers['Content-Type'];
    }
  }

  return fetch(url, { ...options, headers });
};

export { fetchWithAuth };