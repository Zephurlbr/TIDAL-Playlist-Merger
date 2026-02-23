import { apiClient } from './client';
import type { Playlist } from '../types';

export const playlistsApi = {
  async resolve(url: string): Promise<Playlist> {
    const response = await apiClient.post<Playlist>('/api/playlist/resolve', { url });
    return response.data;
  },
  
  async getMyPlaylists(): Promise<{playlists: Playlist[]}> {
    const response = await apiClient.get<{playlists: Playlist[]}>('/api/me/playlists');
    return response.data;
  }
};
