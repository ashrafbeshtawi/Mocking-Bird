const fetchWithAuth = (url: string, options: RequestInit = {}) => {
  console.error('Using token for fetch:');

  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  return fetch(url, { ...options, headers });
};

export { fetchWithAuth };
