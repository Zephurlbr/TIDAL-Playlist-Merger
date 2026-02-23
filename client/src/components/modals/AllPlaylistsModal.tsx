import PlaylistPreview from '../PlaylistPreview';
import type { Playlist } from '../../types';

interface AllPlaylistsModalProps {
  show: boolean;
  playlists: Playlist[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function AllPlaylistsModal({ 
  show, 
  playlists, 
  selectedIds, 
  onToggle, 
  onRemove, 
  onClose 
}: AllPlaylistsModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>All Playlists ({playlists.length})</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="playlists-list">
            {playlists.map(playlist => (
              <PlaylistPreview
                key={playlist.id}
                id={playlist.id}
                name={playlist.name}
                trackCount={playlist.trackCount}
                coverUrl={playlist.coverUrl}
                fallbackCovers={playlist.fallbackCovers}
                selected={selectedIds.has(playlist.id)}
                onToggle={() => onToggle(playlist.id)}
                onRemove={() => onRemove(playlist.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllPlaylistsModal;
