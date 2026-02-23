export type ContentType = 'playlist' | 'album' | 'mix' | 'favorites';

export interface Content {
  id: string;
  name: string;
  trackCount: number;
  coverUrl: string | null;
  fallbackCovers: string[];
  contentType: ContentType;
  artist?: string;
  isFavorites?: boolean;
  description?: string;
  year?: number;
}

export interface SearchResponse {
  results: Content[];
  total: number;
  hasMore: boolean;
}

export interface UserPlaylistsResponse {
  playlists: Content[];
  favorites: Content;
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

export interface DuplicateTrack {
  name: string;
  artist: string;
  appearedIn: string[] | string;
  type?: 'cross' | 'intra';
}
