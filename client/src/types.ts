/**
 * A playlist, album, mix, or favorites collection that can be merged.
 */
export interface Playlist {
    id: string;
    name: string;
    trackCount: number;
    /** True while the backend is still counting favorite tracks */
    trackCountLoading?: boolean;
    coverUrl: string | null;
    /** Up to 4 album covers used as a mosaic when no playlist cover exists */
    fallbackCovers: string[];
    type?: 'playlist' | 'album' | 'mix' | 'favorites';
}

/**
 * A track that appeared in multiple playlists (or multiple times within one).
 */
export interface DuplicateTrack {
    name: string;
    artist: string;
    coverUrl?: string;
    /** Playlist names where this track was found */
    appearedIn: string[];
    /** 'cross' = between playlists, 'intra' = within same playlist */
    type?: 'cross' | 'intra';
}

/**
 * The result returned after a successful merge operation.
 */
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
    /** True if the merged playlist hit TIDAL's 10,000 track limit */
    wasTruncated: boolean;
    truncatedCount: number;
}

