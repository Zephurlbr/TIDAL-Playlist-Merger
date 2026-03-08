import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { validatePlaylistUrl } from '../utils/urlValidator';

interface AddPlaylistInputProps {
  onAdd: (url: string) => Promise<void>;
  disabled: boolean;
  maxReached: boolean;
}

function AddPlaylistInput({ onAdd, disabled, maxReached }: AddPlaylistInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Validate input then resolve the TIDAL URL via the backend */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (maxReached) {
      setError('Maximum 200 playlists allowed');
      return;
    }

    const validation = validatePlaylistUrl(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    setLoading(true);
    try {
      await onAdd(url);
      setUrl('');
    } catch (err: unknown) {
      // Extract a user-friendly message from Axios error responses
      const axiosError = err as { response?: { data?: { detail?: string | string[] } } };
      const detail = axiosError.response?.data?.detail;

      let message: string;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map(d => (d as { msg?: string }).msg || String(d)).join(', ');
      } else if (err instanceof Error) {
        message = err.message;
      } else {
        message = 'Failed to add playlist';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Search size={22} className="text-tidal-yellow" />
        <label className="text-sm font-bold text-tidal-yellow uppercase tracking-[0.15em] opacity-80">Add by link or ID</label>
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="https://tidal.com/browse/playlist/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled || loading}
          className={`flex-1 bg-white/5 border border-white/10 focus:border-tidal-yellow/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(255,220,0,0.15)] rounded-xl py-2.5 px-4 outline-none transition-all duration-300 text-lg
            ${error ? 'border-red-500/50 focus:border-red-500 focus:shadow-red-500/20' : ''}`}
        />
        <button
          type="submit"
          disabled={disabled || loading || maxReached}
          className="btn-primary flex items-center justify-center gap-2 px-6"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-tidal-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus size={20} />
              <span>Add</span>
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 font-medium animate-slide-down pl-1">
          {error}
        </p>
      )}
    </form>
  );
}

export default AddPlaylistInput;
