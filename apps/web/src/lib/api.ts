import { useAuthStore } from '../store/authStore';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

const processQueue = () => {
  refreshQueue.forEach((cb) => cb());
  refreshQueue = [];
};

export async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const activeSwitchTenant = typeof window !== 'undefined' ? localStorage.getItem('activeSwitchTenantId') : null;
  const { csrfToken } = useAuthStore.getState();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(activeSwitchTenant ? { 'x-switch-tenant': activeSwitchTenant } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            useAuthStore.getState().setCsrfToken(data.csrfToken);
            useAuthStore.getState().setIsAuthenticated(true);
            isRefreshing = false;
            
            // Process queue
            processQueue();
            
            // Retry current request with new CSRF token
            const retriedOptions = {
              ...options,
              headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                'X-CSRF-Token': data.csrfToken,
              },
            };
            return apiRequest(path, retriedOptions);
          }
        } catch (refreshErr) {
          console.error('Silent token refresh failed:', refreshErr);
        }

        isRefreshing = false;
        processQueue();
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        throw new Error('Session expired');
      } else {
        return new Promise((resolve) => {
          refreshQueue.push(() => {
            resolve(apiRequest(path, options));
          });
        });
      }
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
