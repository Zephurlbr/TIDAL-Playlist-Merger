import { useState, useEffect } from 'react';
import type { Playlist } from '../../types';
import { playlistsApi } from '../../api';

interface MyPlaylistsModalProps {
  show: boolean;
  onAdd: (playlist: Playlist) => void;
  onClose: () => void;
}

function MyPlaylistsModal({ show, onAdd, onClose }: MyPlaylistsModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      const fetchPlaylists = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await playlistsApi.getMyPlaylists();
          setPlaylists(res.playlists);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to load your playlists');
        } finally {
          setLoading(false);
        }
      };

      fetchPlaylists();
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>My Playlists</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ minHeight: '300px' }}>
          {loading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <span className="loading-spinner"></span>
              <p>Loading your playlists...</p>
            </div>
          )}
          {error && (
            <div className="status-message error">
              {error}
            </div>
          )}
          {!loading && !error && playlists.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No playlists found.</p>
          )}
          {!loading && !error && playlists.length > 0 && (
            <div className="playlists-list">
              {playlists.map(playlist => (
                <div key={playlist.id} className="duplicate-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="preview-cover" style={{ width: '48px', height: '48px' }}>
                      {playlist.coverUrl ? (
                        <img src={playlist.coverUrl} alt={playlist.name} />
                      ) : (
                        <div className="cover-placeholder" style={{ fontSize: '1rem' }}>🎵</div>
                      )}
                    </div>
                    <div>
                      <div className="duplicate-name">{playlist.name}</div>
                      {playlist.trackCount !== null && (
                        <div className="duplicate-artist">{playlist.trackCount} tracks</div>
                      )}
                    </div>
                  </div>
                  <button 
                    className="view-duplicates-btn"
                    onClick={() => {
                      onAdd(playlist);
                    }}
                  >
                    Add to Queue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyPlaylistsModal;
