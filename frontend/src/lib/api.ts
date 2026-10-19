import { AdminUser, Business, Card, ProductionEvent, AuditLog, ManifestItem, InspectedCardToken } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('octo_admin_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, user: AdminUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('octo_admin_token', token);
    localStorage.setItem('octo_admin_user', JSON.stringify(user));
  } catch (err) {
    console.error('Storage setItem error:', err);
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('octo_admin_token');
    localStorage.removeItem('octo_admin_user');
  } catch (err) {
    console.error('Storage removeItem error:', err);
  }
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('octo_admin_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearStoredToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.dispatchEvent(new Event('octo:unauthorized'));
    }
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = json?.error?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return json.data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string):Promise<{ token: string; admin_user: AdminUser }> {
    const res = await request<{ token: string; admin_user: AdminUser }>('/api/v1/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token, res.admin_user);
    return res;
  },

  async getMe(): Promise<AdminUser> {
    return request<AdminUser>('/api/v1/admin/auth/me');
  },

  // Businesses
  async getBusinesses(params?: { search?: string; status?: string; limit?: number; offset?: number }): Promise<{ businesses: Business[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/v1/admin/businesses?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return {
      businesses: json.data || [],
      total: json.meta?.total || 0,
    };
  },

  async getBusiness(id: string): Promise<Business> {
    return request<Business>(`/api/v1/admin/businesses/${id}`);
  },

  async createBusiness(name: string, google_review_url: string): Promise<Business> {
    return request<Business>('/api/v1/admin/businesses', {
      method: 'POST',
      body: JSON.stringify({ name, google_review_url }),
    });
  },

  async updateBusiness(id: string, data: { name?: string; google_review_url?: string; status?: string }): Promise<Business> {
    return request<Business>(`/api/v1/admin/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async verifyBusinessURL(id: string): Promise<Business> {
    return request<Business>(`/api/v1/admin/businesses/${id}/verify-url`, {
      method: 'POST',
    });
  },

  async resolveGoogleReviewLink(mapsUrl: string): Promise<{ review_url: string; place_id?: string }> {
    const trimmed = mapsUrl.trim();
    if (!trimmed) {
      throw new Error('URL Google Maps wajib diisi');
    }

    // If input is already a direct writereview link, return directly
    if (trimmed.includes('search.google.com/local/writereview')) {
      const match = trimmed.match(/[?&]placeid=([^&#]+)/);
      return {
        review_url: trimmed,
        place_id: match ? match[1] : undefined,
      };
    }

    // Attempt 1: Call internal Next.js API route (/api/google-review-link) to avoid browser CORS
    try {
      const res = await fetch('/api/google-review-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maps_url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error?.message || data.error?.recovery || 'Gagal mengonversi URL Google Maps';
        throw new Error(msg);
      }
      if (data.review_url) {
        return {
          review_url: data.review_url,
          place_id: data.place_id,
        };
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed')) {
        throw err;
      }
    }

    // Attempt 2: Call Go Backend proxy
    try {
      const res = await fetch(`${API_BASE}/api/v1/google-review-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maps_url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error?.message || data.error?.recovery || data.message || 'Gagal mengonversi URL Google Maps';
        throw new Error(msg);
      }
      if (data.review_url) {
        return {
          review_url: data.review_url,
          place_id: data.place_id,
        };
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed')) {
        throw err;
      }
    }

    // Attempt 3: Direct call to Productmate
    const res = await fetch('https://productmate.com/api/v1/google-review-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maps_url: trimmed }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || data.error?.recovery || 'Gagal mengonversi URL Google Maps';
      throw new Error(msg);
    }
    if (!data.review_url) {
      throw new Error('Tidak ditemukan review_url dalam respon');
    }
    return {
      review_url: data.review_url,
      place_id: data.place_id,
    };
  },

  // Cards
  async batchIssueCards(businessId: string, quantity: number, idempotencyKey?: string): Promise<{ batch_id: string; count: number; cards: Card[] }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return request<{ batch_id: string; count: number; cards: Card[] }>(`/api/v1/admin/businesses/${businessId}/cards`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ quantity, idempotency_key: idempotencyKey }),
    });
  },

  async batchIssueStockCards(quantity: number, idempotencyKey?: string): Promise<{ batch_id: string; count: number; cards: Card[] }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return request<{ batch_id: string; count: number; cards: Card[] }>('/api/v1/admin/cards/issue-stock', {
      method: 'POST',
      headers,
      body: JSON.stringify({ quantity, idempotency_key: idempotencyKey }),
    });
  },

  async assignAndActivateCard(id: string, data: { business_id?: string; business_name?: string; google_review_url?: string }): Promise<Card> {
    return request<Card>(`/api/v1/admin/cards/${id}/assign-activate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCards(params?: { business_id?: string; batch_id?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<{ cards: Card[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.business_id) q.set('business_id', params.business_id);
    if (params?.batch_id) q.set('batch_id', params.batch_id);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/v1/admin/cards?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return {
      cards: json.data || [],
      total: json.meta?.total || 0,
    };
  },

  async getCard(id: string): Promise<{ card: Card; events: ProductionEvent[] }> {
    return request<{ card: Card; events: ProductionEvent[] }>(`/api/v1/admin/cards/${id}`);
  },

  async generateQR(id: string): Promise<{ card_id: string; qr_code_url: string }> {
    return request<{ card_id: string; qr_code_url: string }>(`/api/v1/admin/cards/${id}/generate-qr`, {
      method: 'POST',
    });
  },

  async recordProductionEvent(cardId: string, eventType: string, payload: Record<string, any>, notes: string): Promise<ProductionEvent> {
    return request<ProductionEvent>(`/api/v1/admin/cards/${cardId}/production-events`, {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, payload, notes }),
    });
  },

  async activateCard(id: string): Promise<Card> {
    return request<Card>(`/api/v1/admin/cards/${id}/activate`, {
      method: 'POST',
    });
  },

  async deactivateCard(id: string): Promise<Card> {
    return request<Card>(`/api/v1/admin/cards/${id}/deactivate`, {
      method: 'POST',
    });
  },

  async revokeCard(id: string): Promise<Card> {
    return request<Card>(`/api/v1/admin/cards/${id}/revoke`, {
      method: 'POST',
    });
  },

  async restoreCard(id: string): Promise<Card> {
    return request<Card>(`/api/v1/admin/cards/${id}/restore`, {
      method: 'POST',
    });
  },

  // Manifest
  async getManifest(params?: { business_id?: string; batch_id?: string }): Promise<ManifestItem[]> {
    const q = new URLSearchParams();
    if (params?.business_id) q.set('business_id', params.business_id);
    if (params?.batch_id) q.set('batch_id', params.batch_id);

    return request<ManifestItem[]>(`/api/v1/admin/manifest?${q.toString()}`);
  },

  // Audit Logs
  async getAuditLogs(params?: { entity_type?: string; entity_id?: string; action?: string; admin_email?: string; limit?: number; offset?: number }): Promise<{ logs: AuditLog[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.entity_type) q.set('entity_type', params.entity_type);
    if (params?.entity_id) q.set('entity_id', params.entity_id);
    if (params?.action) q.set('action', params.action);
    if (params?.admin_email) q.set('admin_email', params.admin_email);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/v1/admin/audit-logs?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return {
      logs: json.data || [],
      total: json.meta?.total || 0,
    };
  },

  getQRDownloadUrl(cardId: string): string {
    const token = getStoredToken();
    return `${API_BASE}/api/v1/admin/cards/${cardId}/qr.png${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async downloadCardQRPNG(cardId: string, filename: string): Promise<void> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/v1/admin/cards/${cardId}/qr.png`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || 'Gagal mengunduh gambar PNG');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  getRedirectUrl(token: string): string {
    return `${API_BASE}/r/${token}`;
  },

  // Instant On-Tap Field Activation
  async inspectCardToken(token: string): Promise<InspectedCardToken> {
    return request<InspectedCardToken>(`/api/v1/cards/inspect-token?token=${encodeURIComponent(token)}`);
  },

  async activateCardByToken(data: {
    token: string;
    business_name: string;
    google_review_url: string;
  }): Promise<Card> {
    return request<Card>('/api/v1/admin/cards/activate-by-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
