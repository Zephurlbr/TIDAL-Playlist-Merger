import { useState, useRef, useEffect } from 'react';
import type { MergeResult } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/** TIDAL's maximum tracks per playlist */
const TRACK_LIMIT = 10000;

// Re-export so consumers can import from either location
export type { MergeResult };

export type DedupeMode = 'off' | 'inter' | 'intra' | 'full';
export type StatusType = 'idle' | 'info' | 'success' | 'error';

/**
 * Hook that manages the playlist merge operation via SSE (Server-Sent Events).
 * Handles progress tracking, status messages, and result data.
 */
export function useMerge() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState<StatusType>('idle');
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup abort controller on unmount to prevent SSE memory leaks
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // --- Merge Operation ---

    const merge = async (playlistIds: string[], newName: string, dedupeMode: DedupeMode) => {
        // Client-side validation
        if (playlistIds.length < 2) {
            setStatus('Please select at least 2 playlists to merge.');
            setStatusType('error');
            return;
        }
        if (!newName.trim()) {
            setStatus('Please enter a name for your new merged playlist.');
            setStatusType('error');
            return;
        }

        setLoading(true);
        setStatus('Starting merge process...');
        setStatusType('info');
        setMergeResult(null);
        setMergeSuccess(false);

        try {
            // Initiate SSE stream for real-time progress updates
            abortControllerRef.current = new AbortController();
            const response = await fetch(`${API_BASE}/api/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    playlistIds,
                    name: newName.trim(),
                    dedupeMode,
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Failed to read response');
            }

            // Parse the SSE stream chunk by chunk
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE messages are separated by double newlines
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));

                        // Keep-alive ping — skip
                        if (data.ping) continue;

                        // Server-side error
                        if (data.error) {
                            setStatus(`Error: ${data.error}`);
                            setStatusType('error');
                            setLoading(false);
                            return;
                        }

                        // Merge completed successfully
                        if (data.complete && data.result) {
                            const result = data.result as MergeResult;
                            setMergeResult(result);
                            setStatus(buildSuccessMessage(result, dedupeMode));
                            setStatusType('success');
                            setLoading(false);
                            setMergeSuccess(true);
                            return;
                        }

                        // Progress update
                        if (data.progress !== undefined) {
                            setStatus(`${data.message} (${Math.round(data.progress)}%)`);
                            setStatusType('info');
                        } else if (data.message) {
                            setStatus(data.message);
                            setStatusType('info');
                        }
                    } catch (e) {
                        console.error('Failed to parse SSE data:', e);
                    }
                }
            }

            // Safety net: if the stream ended without a complete/error event,
            // reset loading so the user doesn't get stuck on "Merging..."
            setLoading(false);
            if (!mergeSuccess && statusType !== 'error') {
                setStatus('Merge stream ended unexpectedly. Please check your TIDAL account.');
                setStatusType('error');
            }
        } catch (error: unknown) {
            // Ignore abort errors as they are intentional on unmount
            const err = error as Error;
            if (err.name === 'AbortError') return;

            const message = err.message || 'Unknown error';
            setStatus(`Merge failed: ${message}`);
            setStatusType('error');
            setLoading(false);
        } finally {
            abortControllerRef.current = null;
        }
    };

    // --- Helpers ---

    const clearMergeState = () => {
        setStatus('');
        setMergeSuccess(false);
        setMergeResult(null);
    };

    return {
        loading,
        status,
        statusType,
        mergeSuccess,
        mergeResult,
        merge,
        clearMergeState
    };
}

/**
 * Build a human-readable success message based on merge results and dedup mode.
 */
function buildSuccessMessage(result: MergeResult, dedupeMode: DedupeMode): string {
    let message = `Done! Created playlist with ${result.trackCount} tracks.`;

    if (result.duplicatesRemoved > 0) {
        if (result.intraPlaylistDuplicates > 0 && dedupeMode === 'full') {
            message += ` (${result.duplicatesRemoved} duplicates removed, including ${result.intraPlaylistDuplicates} within playlists)`;
        } else if (result.intraPlaylistDuplicates > 0 && dedupeMode === 'intra') {
            message += ` (${result.duplicatesRemoved} intra-playlist duplicates removed)`;
        } else if (result.crossPlaylistDuplicates > 0 && dedupeMode === 'inter') {
            message += ` (${result.duplicatesRemoved} cross-playlist duplicates removed)`;
        } else {
            message += ` (${result.duplicatesRemoved} duplicates removed)`;
        }
    } else if (dedupeMode === 'off' && (result.crossPlaylistDuplicates > 0 || result.intraPlaylistDuplicates > 0)) {
        const totalFound = result.crossPlaylistDuplicates + result.intraPlaylistDuplicates;
        message += ` (${totalFound} duplicates found but kept)`;
    }

    if (result.wasTruncated) {
        message += ` Note: Tidal limits playlists to ${TRACK_LIMIT.toLocaleString()} tracks — ${result.truncatedCount.toLocaleString()} additional tracks were not added.`;
    }

    return message;
}
