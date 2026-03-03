import { useState } from 'react';
import { Plus } from 'lucide-react';
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
      const message = err instanceof Error ? err.message : 'Failed to add playlist';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Paste TIDAL playlist link or ID..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled || loading}
          className={`flex-1 bg-white/5 border rounded-xl py-3 px-4 outline-none transition-all duration-300
            ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-tidal-yellow/50 focus:bg-white/10'}`}
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
              <Plus size={18} />
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
