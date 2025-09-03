// API Service for centralized API calls
const API_BASE_URL = 'http://localhost:5001/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      };

      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  }

  async verifyToken(): Promise<any> {
    return this.request('/auth/verify');
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Inventory endpoints
  async getInventorySummary() {
    return this.request('/inventory/summary');
  }

  // Product endpoints
  async getProducts(params?: { page?: number; limit?: number; category_id?: number; search?: string }) {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return this.request(`/products${queryString}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async getProductByBarcode(barcode: string) {
    return this.request(`/products/barcode/${barcode}`);
  }

  async getLowStockProducts() {
    return this.request('/products/low-stock');
  }

  // Category endpoints
  async getCategories() {
    return this.request('/categories');
  }

  async getCategory(id: string) {
    return this.request(`/categories/${id}`);
  }

  // Sales endpoints
  async processSale(items: { id: string | number; quantity: number }[]) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // User endpoints
  async getUsers(params?: { page?: number; limit?: number }) {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    return this.request(`/users${queryString}`);
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(payload: { username: string; email: string; password: string; role: string; status?: string }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUser(id: string, payload: { username?: string; email?: string; password?: string; role?: string; status?: string }) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;
