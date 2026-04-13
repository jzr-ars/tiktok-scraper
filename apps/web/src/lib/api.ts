const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const persisted = localStorage.getItem('tiktok-auth');
    if (!persisted) return null;
    const parsed = JSON.parse(persisted);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'An error occurred');
  }

  return data as T;
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<{ success: boolean; message: string; data: { token: string; user: { id: string; name: string; email: string } } }>('/auth/register', { method: 'POST', body }),
    login: (body: { email: string; password: string }) =>
      request<{ success: boolean; message: string; data: { token: string; user: { id: string; name: string; email: string } } }>('/auth/login', { method: 'POST', body }),
    me: () =>
      request<{ success: boolean; data: { id: string; name: string; email: string } }>('/auth/me'),
    logout: () =>
      request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' }),
    updateProfile: (body: { name?: string; email?: string }) =>
      request<{ success: boolean; message: string }>('/auth/profile', { method: 'PATCH', body }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>('/auth/password', { method: 'PATCH', body }),
  },
  scraper: {
    manualScrape: (body: { keyword: string; watermarks?: unknown[] }) =>
      request<{ success: boolean; message: string; data: string }>('/scraper/manual', { method: 'POST', body }),
    getJobs: () =>
      request<{ success: boolean; data: Array<{
        id: string;
        status: string;
        triggerType: string;
        keyword: string;
        filePath: string | null;
        fileSizeBytes: number | null;
        errorMessage: string | null;
        createdAt: string;
        updatedAt: string;
      }> }>('/scraper/jobs'),
    getBalance: () =>
      request<{ success: boolean; data: { balance: number; usedStorageBytes: number } }>('/scraper/balance'),
    buyCredits: (body: { amount: number }) =>
      request<{ success: boolean; message: string }>('/scraper/buy-credits', { method: 'POST', body }),
    deleteJob: (jobId: string) =>
      request<{ success: boolean; message: string }>(`/scraper/jobs/${jobId}`, { method: 'DELETE' }),
  },
};
