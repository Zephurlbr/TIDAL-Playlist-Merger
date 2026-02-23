import { apiClient } from './client';
import type { Config } from '../types';

export const configApi = {
  async getConfig(): Promise<Config> {
    const response = await apiClient.get<Config>('/api/config');
    return response.data;
  },
};
