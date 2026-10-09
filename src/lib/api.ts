import { io } from 'socket.io-client';

const API_URL = '/api';

export const socket = io();

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  async register(data: any) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    if (result.token) localStorage.setItem('token', result.token);
    return result;
  },

  async login(data: any) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    if (result.token) localStorage.setItem('token', result.token);
    return result;
  },

  async verifyReset(data: any) {
    const res = await fetch(`${API_URL}/auth/verify-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async resetPassword(data: any) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  logout() {
    localStorage.removeItem('token');
  },

  async getUser(id: string) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateUser(id: string, data: any) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createBooking(data: any) {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getBookings(userId?: string, isAdmin?: boolean, forceRefresh?: boolean, page: number = 1, limit: number = 50) {
    let url = `${API_URL}/bookings`;
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (isAdmin) params.append('isAdmin', 'true');
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('_t', Date.now().toString());
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateBooking(id: string, data: any) {
    const res = await fetch(`${API_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async downloadMonthlyReport() {
    const token = localStorage.getItem('token');
    window.open(`${API_URL}/reports/monthly?token=${token}`, '_blank');
  },

  async getRevenueLogs(forceRefresh?: boolean, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams();
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('_t', Date.now().toString());
    const res = await fetch(`${API_URL}/revenue?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getVehicles(forceRefresh?: boolean, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams();
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('_t', Date.now().toString());
    const res = await fetch(`${API_URL}/vehicles?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDrivers(forceRefresh?: boolean, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams();
    if (forceRefresh) params.append('forceRefresh', 'true');
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('_t', Date.now().toString());
    const res = await fetch(`${API_URL}/drivers?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addDriver(data: { name: string; phone: string; email: string }) {
    const res = await fetch(`${API_URL}/drivers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteDriver(id: string) {
    const res = await fetch(`${API_URL}/drivers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addVehicle(data: { name: string; number: string }) {
    const res = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteVehicle(id: string) {
    const res = await fetch(`${API_URL}/vehicles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async assignDriver(bookingId: string, driverId: string, vehicleId: string, assignments?: {driverId: string, vehicleId: string}[]) {
    const payload = assignments ? { assignments } : { driverId, vehicleId };
    const res = await fetch(`${API_URL}/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to assign driver');
    }
    return res.json();
  }
};
