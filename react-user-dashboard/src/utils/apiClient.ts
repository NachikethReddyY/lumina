// API Client - Stub for future integration
// Replace with actual axios or fetch implementation when backend is ready

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// API request wrapper
export async function apiRequest(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  return response;
}

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  signup: (data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
  }) =>
    apiRequest('/api/auth/signup', {
      method: 'POST',
      body: data,
    }),

  refreshToken: () =>
    apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: localStorage.getItem('refreshToken') },
    }),
};

export default apiRequest;
