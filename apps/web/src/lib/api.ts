export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string | null = null) => {
  refreshQueue.forEach((cb) => {
    if (token) cb(token);
  });
  refreshQueue = [];
};

export async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`,
              },
            });

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              localStorage.setItem('accessToken', data.accessToken);
              localStorage.setItem('refreshToken', data.refreshToken);
              isRefreshing = false;
              
              // Process queue
              processQueue(data.accessToken);
              
              // Retry current request
              const retriedOptions = {
                ...options,
                headers: {
                  ...options.headers,
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${data.accessToken}`,
                },
              };
              return apiRequest(path, retriedOptions);
            }
          } catch (refreshErr) {
            console.error('Silent token refresh failed:', refreshErr);
          }

          isRefreshing = false;
          processQueue(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Session expired');
        } else {
          return new Promise((resolve) => {
            refreshQueue.push((newToken) => {
              const retriedOptions = {
                ...options,
                headers: {
                  ...options.headers,
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${newToken}`,
                },
              };
              resolve(apiRequest(path, retriedOptions));
            });
          });
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
