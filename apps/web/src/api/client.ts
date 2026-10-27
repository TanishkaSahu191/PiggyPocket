import { tokenStorage } from '../services/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const accessToken = tokenStorage.getAccessToken();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized with token refresh attempt
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          tokenStorage.setAccessToken(refreshData.accessToken);
          tokenStorage.setRefreshToken(refreshData.refreshToken);

          // Retry original request with newly rotated access token
          headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
          response = await fetch(url, {
            ...options,
            headers
          });
        } else {
          tokenStorage.clearTokens();
        }
      } catch {
        tokenStorage.clearTokens();
      }
    } else {
      tokenStorage.clearTokens();
    }
  }

  const responseText = await response.text();
  let data: any = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    const errorObj = data.error || data;
    throw new ApiError(
      response.status,
      errorObj.code || 'API_ERROR',
      errorObj.message || 'Request failed',
      errorObj.details
    );
  }

  return data as T;
}
