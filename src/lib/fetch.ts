/**
 * Fetch wrapper that includes credentials (cookies) for authenticated requests.
 * Uses httpOnly cookies for authentication - no localStorage token needed.
 */
const fetchWithAuth = (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    ...(options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)
      ? (options.headers as Record<string, string>)
      : {}),
  };

  // If body is a plain object, send as JSON
  let body = options.body;
  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData)
  ) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  // If body is FormData, do not set Content-Type (browser will handle multipart boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  return fetch(url, {
    ...options,
    body,
    headers,
    credentials: 'include', // Always include cookies for authentication
  });
};

export { fetchWithAuth };
