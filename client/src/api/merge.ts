import { getApiBase } from './client';
import type { MergeResult } from '../types';

export interface MergeProgressData {
  message?: string;
  progress?: number;
  complete?: boolean;
  result?: MergeResult;
  error?: string;
  ping?: boolean;
}

export interface MergeOptions {
  playlistIds: string[];
  name: string;
  keepItTidy: boolean;
  onProgress: (data: MergeProgressData) => void;
  onComplete: (result: MergeResult) => void;
  onError: (error: string) => void;
}

export const mergeApi = {
  async merge(options: MergeOptions): Promise<void> {
    const { playlistIds, name, keepItTidy, onProgress, onComplete, onError } = options;
    const apiBase = getApiBase();

    const response = await fetch(`${apiBase}/api/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playlistIds,
        name: name.trim(),
        keepItTidy,
      }),
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
            const data = JSON.parse(line.slice(6)) as MergeProgressData;

            if (data.ping) continue;

            if (data.error) {
              onError(data.error);
              return;
            }

            if (data.complete && data.result) {
              onComplete(data.result);
              return;
            }

            onProgress(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  },
};
