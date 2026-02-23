import { useState, useCallback } from 'react';
import { playlistsApi } from '../api';
import type { Playlist } from '../types';

export interface UsePlaylistsReturn {
  playlists: Playlist[];
  selectedIds: Set<string>;
  handleAddPlaylist: (url: string) => Promise<void>;
  handleAddPlaylistObject: (playlist: Playlist) => void;
  handleRemovePlaylist: (id: string) => void;
  handleTogglePlaylist: (id: string) => void;
  handleReorderPlaylists: (reorderedPlaylists: Playlist[]) => void;
  handleClear: () => void;
  resetMergeState: () => void;
}

export function usePlaylists(onAddError?: (error: string) => void): UsePlaylistsReturn {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleAddPlaylist = useCallback(async (url: string) => {
    try {
      const playlist = await playlistsApi.resolve(url);

      if (playlists.find(p => p.id === playlist.id)) {
        throw new Error('Playlist already added');
      }

      setPlaylists(prev => [playlist, ...prev]);
      setSelectedIds(prev => new Set(prev).add(playlist.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add playlist';
      onAddError?.(message);
      throw error;
    }
  }, [playlists, onAddError]);

  const handleAddPlaylistObject = useCallback((playlist: Playlist) => {
    if (playlists.find(p => p.id === playlist.id)) {
      const message = 'Playlist already added';
      onAddError?.(message);
      return;
    }

    setPlaylists(prev => [playlist, ...prev]);
    setSelectedIds(prev => new Set(prev).add(playlist.id));
  }, [playlists, onAddError]);

  const handleRemovePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleTogglePlaylist = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleReorderPlaylists = useCallback((reorderedPlaylists: Playlist[]) => {
    setPlaylists(reorderedPlaylists);
  }, []);

  const handleClear = useCallback(() => {
    setPlaylists([]);
    setSelectedIds(new Set());
  }, []);

  const resetMergeState = useCallback(() => {
    // Called when starting a new merge to reset success state
  }, []);

  return {
    playlists,
    selectedIds,
    handleAddPlaylist,
    handleAddPlaylistObject,
    handleRemovePlaylist,
    handleTogglePlaylist,
    handleReorderPlaylists,
    handleClear,
    resetMergeState,
  };
}
