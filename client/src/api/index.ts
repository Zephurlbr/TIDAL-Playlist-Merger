export { apiClient, getApiBase } from './client';
export { authApi } from './auth';
export { playlistsApi } from './playlists';
export { mergeApi } from './merge';
export { configApi } from './config';

export type { LoginResponse, AuthStatusResponse, AuthCheckResponse } from './auth';
export type { MergeProgressData, MergeOptions } from './merge';
