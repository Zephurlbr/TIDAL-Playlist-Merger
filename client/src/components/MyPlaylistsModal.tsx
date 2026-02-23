import { useState } from 'react';
import type { Content } from '../types';
import ContentCover from './ContentCover';

interface MyPlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Content | null;
  playlists: Content[];
  onAdd: (content: Content) => void;
  loading: boolean;
}

function MyPlaylistsModal({ 
  isOpen, 
  onClose, 
  favorites, 
  playlists, 
  onAdd,
  loading 
}: MyPlaylistsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  
  if (!isOpen) return null;
  
  const filteredPlaylists = searchQuery
    ? playlists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : playlists;
  
  const visiblePlaylists = filteredPlaylists.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPlaylists.length;
  
  const handleAdd = (content: Content) => {
    onAdd(content);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content my-playlists-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>My Playlists</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <input
            type="text"
            placeholder="Search your playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="playlist-search-input"
          />
          
          {loading ? (
            <div className="modal-loading">
              <span className="loading-spinner"></span>
              <span>Loading your playlists...</span>
            </div>
          ) : (
            <>
              {favorites && (
                <div 
                  className="favorites-card"
                  onClick={() => handleAdd(favorites)}
                >
                  <ContentCover content={favorites} size="small" />
                  <div className="favorites-info">
                    <span className="favorites-name">Liked Songs</span>
                    <span className="favorites-count">{favorites.trackCount} tracks</span>
                  </div>
                  <button className="add-btn">Add</button>
                </div>
              )}
              
              {filteredPlaylists.length === 0 && searchQuery && (
                <div className="no-results">
                  No playlists match "{searchQuery}"
                </div>
              )}
              
              <div className="playlists-list">
                {visiblePlaylists.map(playlist => (
                  <div 
                    key={playlist.id} 
                    className="playlist-item"
                    onClick={() => handleAdd(playlist)}
                  >
                    <ContentCover content={playlist} size="small" />
                    <div className="playlist-info">
                      <span className="playlist-name">{playlist.name}</span>
                      <span className="playlist-count">{playlist.trackCount} tracks</span>
                    </div>
                    <button className="add-btn">Add</button>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <button 
                  className="load-more-btn"
                  onClick={() => setVisibleCount(prev => prev + 20)}
                >
                  Load More ({filteredPlaylists.length - visibleCount} remaining)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyPlaylistsModal;
