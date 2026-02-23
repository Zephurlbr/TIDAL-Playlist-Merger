import { apiClient, getApiBase } from './client';

export interface LoginResponse {
  login_url: string;
  user_code?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
}

export interface AuthCheckResponse {
  completed: boolean;
  authenticated: boolean;
}

export const authApi = {
  async getStatus(): Promise<AuthStatusResponse> {
    const response = await apiClient.get<AuthStatusResponse>('/auth/status');
    return response.data;
  },

  async login(): Promise<LoginResponse> {
    const response = await apiClient.get<LoginResponse>('/auth/login');
    return response.data;
  },

  async check(): Promise<AuthCheckResponse> {
    const response = await apiClient.get<AuthCheckResponse>('/auth/check');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  getApiBase(): string {
    return getApiBase();
  },
};
