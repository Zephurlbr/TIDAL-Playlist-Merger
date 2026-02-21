import { useState } from 'react';
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
      setError('Maximum 10 playlists allowed');
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
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to add playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-playlist-form">
      <div className="input-row">
        <input
          type="text"
          placeholder="Paste TIDAL playlist link or ID..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled || loading}
          className={error ? 'input-error' : ''}
        />
        <button type="submit" disabled={disabled || loading || maxReached}>
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error && <span className="inline-error">{error}</span>}
    </form>
  );
}

export default AddPlaylistInput;
