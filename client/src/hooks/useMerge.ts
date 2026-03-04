import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const TRACK_LIMIT = 10000;

export interface MergeResult {
    id: string;
    trackCount: number;
    totalFetched: number;
    duplicatesRemoved: number;
    crossPlaylistDuplicates: number;
    intraPlaylistDuplicates: number;
    playlistCounts: number[];
    duplicates: Array<{
        name: string;
        artist: string;
        coverUrl?: string;
        appearedIn: string[] | string;
        type?: 'cross' | 'intra';
    }>;
    totalDuplicateTracks: number;
    wasTruncated: boolean;
    truncatedCount: number;
}

export type DedupeMode = 'off' | 'inter' | 'intra' | 'full';
export type StatusType = 'idle' | 'info' | 'success' | 'error';

export function useMerge() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState<StatusType>('idle');
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

    const merge = async (playlistIds: string[], newName: string, dedupeMode: DedupeMode) => {
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
            const response = await fetch(`${API_BASE}/api/merge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlistIds,
                    name: newName.trim(),
                    dedupeMode: dedupeMode
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

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.ping) continue;

                            if (data.error) {
                                setStatus(`Error: ${data.error}`);
                                setStatusType('error');
                                setLoading(false);
                                return;
                            }

                            if (data.complete && data.result) {
                                const result = data.result as MergeResult;
                                setMergeResult(result);

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
                                    message += ` Note: Tidal limits playlists to ${TRACK_LIMIT.toLocaleString()} tracks - ${result.truncatedCount.toLocaleString()} additional tracks were not added.`;
                                }
                                setStatus(message);
                                setStatusType('success');
                                setLoading(false);
                                setMergeSuccess(true);
                                return;
                            }

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
            }
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setStatus(`Merge failed: ${message}`);
            setStatusType('error');
            setLoading(false);
        }
    };

    const clearMergeState = () => {
        setStatus('');
        setMergeSuccess(false);
        setMergeResult(null);
    };

    return {
        loading,
        status,
        statusType,
        setStatus,
        mergeSuccess,
        mergeResult,
        merge,
        clearMergeState
    };
}
