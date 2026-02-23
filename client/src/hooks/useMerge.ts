import { useState, useCallback } from 'react';
import { mergeApi } from '../api';
import type { MergeResult } from '../types';

export interface UseMergeReturn {
  status: string;
  loading: boolean;
  mergeSuccess: boolean;
  mergeResult: MergeResult | null;
  handleMerge: (playlistIds: string[], name: string, deepClean: boolean, trackLimit: number) => Promise<void>;
  resetMerge: () => void;
}

export function useMerge(): UseMergeReturn {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

  const handleMerge = useCallback(async (
    playlistIds: string[],
    name: string,
    deepClean: boolean,
    trackLimit: number
  ) => {
    if (playlistIds.length < 2) {
      setStatus('Please select at least 2 playlists to merge.');
      return;
    }
    if (!name.trim()) {
      setStatus('Please enter a name for your new merged playlist.');
      return;
    }

    setLoading(true);
    setStatus('Starting merge process...');
    setMergeResult(null);
    setMergeSuccess(false);

    try {
      await mergeApi.merge({
        playlistIds,
        name,
        keepItTidy: deepClean,
        onProgress: (data) => {
          if (data.progress !== undefined) {
            setStatus(`${data.message} (${Math.round(data.progress)}%)`);
          } else if (data.message) {
            setStatus(data.message);
          }
        },
        onComplete: (result) => {
          let message = `Done! Created playlist with ${result.trackCount} tracks.`;
          if (result.duplicatesRemoved > 0) {
            if (result.intraPlaylistDuplicates > 0 && deepClean) {
              message += ` (${result.duplicatesRemoved} duplicates removed, including ${result.intraPlaylistDuplicates} within playlists)`;
            } else {
              message += ` (${result.duplicatesRemoved} duplicates removed)`;
            }
          }
          if (result.wasTruncated) {
            message += ` Note: Tidal limits playlists to ${trackLimit.toLocaleString()} tracks - ${result.truncatedCount.toLocaleString()} additional tracks were not added.`;
          }
          setStatus(message);
          setLoading(false);
          setMergeSuccess(true);
          setMergeResult(result);
        },
        onError: (error) => {
          setStatus(`Error: ${error}`);
          setLoading(false);
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Merge failed: ${message}`);
      setLoading(false);
    }
  }, []);

  const resetMerge = useCallback(() => {
    setStatus('');
    setMergeSuccess(false);
    setMergeResult(null);
  }, []);

  return {
    status,
    loading,
    mergeSuccess,
    mergeResult,
    handleMerge,
    resetMerge,
  };
}
