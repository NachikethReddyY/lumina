const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

export type AuthValidationErrorBody = {
  error?: string;
  message?: string;
  details?: Record<string, string>;
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

function apiPath(endpoint: string): string {
  const e = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_PREFIX}${e}`;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

const isAuthPublicPath = (): boolean => {
  const path = window.location.pathname;
  const publicPrefixes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  return publicPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
};

export async function apiRequest(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${apiPath(endpoint)}`;
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

  if (response.status === 401 && !isAuthPublicPath()) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  return response;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  signup: (data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: string;
  }) =>
    apiRequest('/auth/signup', {
      method: 'POST',
      body: data,
    }),

  google: (credential: string) =>
    apiRequest('/auth/google', {
      method: 'POST',
      body: { credential },
    }),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),

  verifyEmail: (token: string) =>
    apiRequest('/auth/verify-email', {
      method: 'POST',
      body: { token },
    }),

  verifyEmailOtp: (email: string, otp: string) =>
    apiRequest('/auth/verify-email-otp', {
      method: 'POST',
      body: { email, otp },
    }),

  resendVerification: (email: string) =>
    apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    }),

  refreshToken: () =>
    apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: localStorage.getItem('refreshToken') },
    }),
};

export default apiRequest;
