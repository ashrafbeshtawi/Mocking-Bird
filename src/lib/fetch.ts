export const fetchWithAuth = (url: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  return fetch(url, { ...options, headers });
};
