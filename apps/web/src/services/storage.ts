/**
 * Token Storage abstraction that operates across standard web browsers and Capacitor WebViews.
 * Uses localStorage with memory caching (without solely relying on cookies).
 */
const ACCESS_TOKEN_KEY = 'piggy_access_token';
const REFRESH_TOKEN_KEY = 'piggy_refresh_token';

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    if (memoryAccessToken) return memoryAccessToken;
    try {
      memoryAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      // In restricted webviews or SSR
    }
    return memoryAccessToken;
  },

  setAccessToken(token: string | null): void {
    memoryAccessToken = token;
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } catch {
      // Fallback to memory
    }
  },

  getRefreshToken(): string | null {
    if (memoryRefreshToken) return memoryRefreshToken;
    try {
      memoryRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      // In restricted webviews or SSR
    }
    return memoryRefreshToken;
  },

  setRefreshToken(token: string | null): void {
    memoryRefreshToken = token;
    try {
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Fallback to memory
    }
  },

  clearTokens(): void {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore
    }
  }
};
