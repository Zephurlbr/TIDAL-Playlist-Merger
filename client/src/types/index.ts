export interface Playlist {
  id: string;
  name: string;
  trackCount: number | null;
  coverUrl: string | null;
  fallbackCovers: string[];
}

export interface DuplicateTrack {
  name: string;
  artist: string;
  appearedIn: string[] | string;
  type?: 'cross' | 'intra';
}

export interface MergeResult {
  id: string;
  trackCount: number;
  totalFetched: number;
  duplicatesRemoved: number;
  crossPlaylistDuplicates: number;
  intraPlaylistDuplicates: number;
  playlistCounts: number[];
  duplicates: DuplicateTrack[];
  totalDuplicateTracks: number;
  wasTruncated: boolean;
  truncatedCount: number;
}

export interface Config {
  trackLimit: number;
  maxPlaylists: number;
}

export type AuthState = 'idle' | 'checking' | 'polling' | 'authenticated' | 'error';
