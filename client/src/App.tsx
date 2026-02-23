import { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import { useAuth, usePlaylists, useMerge, useConfig } from './hooks';
import AddPlaylistInput from './components/AddPlaylistInput';
import { SortablePlaylist } from './components/SortablePlaylist';
import DuplicatesModal from './components/modals/DuplicatesModal';
import AllPlaylistsModal from './components/modals/AllPlaylistsModal';
import MyPlaylistsModal from './components/modals/MyPlaylistsModal';
import './App.css';

function App() {
  const { isAuthenticated, loginUrl, userCode, authError, handleLogin, handleLogout, handleCancelLogin } = useAuth();
  const { config } = useConfig();
  const { playlists, selectedIds, handleAddPlaylist, handleAddPlaylistObject, handleRemovePlaylist, handleTogglePlaylist, handleReorderPlaylists, handleClear } = usePlaylists();
  const { status, loading, mergeSuccess, mergeResult, handleMerge, resetMerge } = useMerge();
  
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showAllPlaylistsModal, setShowAllPlaylistsModal] = useState(false);
  const [showMyPlaylistsModal, setShowMyPlaylistsModal] = useState(false);
  const [deepClean, setDeepClean] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = playlists.findIndex(p => p.id === active.id);
      const newIndex = playlists.findIndex(p => p.id === over.id);
      
      handleReorderPlaylists(arrayMove(playlists, oldIndex, newIndex));
    }
  };

  const onMerge = () => {
    const selectedPlaylists = playlists.filter(p => selectedIds.has(p.id));
    handleMerge(
      selectedPlaylists.map(p => p.id),
      newPlaylistName,
      deepClean,
      config.trackLimit
    );
  };

  const onClear = () => {
    handleClear();
    setNewPlaylistName('');
    resetMerge();
    setShowDuplicatesModal(false);
    setDeepClean(false);
  };

  const onLogout = async () => {
    await handleLogout();
    handleClear();
    resetMerge();
    setNewPlaylistName('');
    setDeepClean(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ textAlign: 'center' }}>
        <h1>TIDAL Playlist Merger</h1>
        <p className="subtitle">Consolidate your music library seamlessly.</p>
        
        {authError && (
          <div className="status-message error">
            {authError}
          </div>
        )}
        
        {!loginUrl ? (
          <button onClick={handleLogin} className="login-button">Connect with TIDAL</button>
        ) : (
          <div className="login-pending" style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '16px', marginBottom: '15px' }}>Waiting for authorization...</p>
            {userCode && (
              <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                Code: {userCode}
              </p>
            )}
            <a 
              href={loginUrl.startsWith('http') ? loginUrl : `https://${loginUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="tidal-auth-link"
            >
              Open TIDAL to Authorize
            </a>
            <p style={{ marginTop: '15px', fontSize: '14px', opacity: 0.7 }}>
              This page will automatically update once authorized.
            </p>
            <button 
              onClick={handleCancelLogin}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
          </div>
        )}
        
        <footer className="github-footer">
          <a 
            href="https://github.com/Zephurlbr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github-link"
            aria-label="View on GitHub"
          >
            <svg viewBox="0 0 24 24" className="github-icon" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </footer>
      </div>
    );
  }

  return (
    <div className="container">
      <DuplicatesModal 
        show={showDuplicatesModal} 
        mergeResult={mergeResult} 
        onClose={() => setShowDuplicatesModal(false)} 
      />
      <AllPlaylistsModal
        show={showAllPlaylistsModal}
        playlists={playlists}
        selectedIds={selectedIds}
        onToggle={handleTogglePlaylist}
        onRemove={handleRemovePlaylist}
        onClose={() => setShowAllPlaylistsModal(false)}
      />
      <MyPlaylistsModal
        show={showMyPlaylistsModal}
        onAdd={(p) => {
          handleAddPlaylistObject(p);
          setShowMyPlaylistsModal(false);
        }}
        onClose={() => setShowMyPlaylistsModal(false)}
      />
      
      <div className="header-row">
        <div>
          <h1>TIDAL Playlist Merger</h1>
          <p className="subtitle">Paste playlist links to merge them into one.</p>
        </div>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>
      
      {status && (
        <div className={`status-message ${status.includes('Error') || status.includes('Failed') ? 'error' : ''} ${mergeSuccess ? 'success' : ''}`}>
          <span>{status}</span>
          {mergeSuccess && mergeResult && mergeResult.duplicatesRemoved > 0 && (
            <button 
              className="view-duplicates-btn"
              onClick={() => setShowDuplicatesModal(true)}
            >
              View Duplicates
            </button>
          )}
        </div>
      )}

      <div className="add-playlist-section">
        <AddPlaylistInput 
          onAdd={handleAddPlaylist} 
          disabled={loading}
          maxReached={playlists.length >= config.maxPlaylists}
        />
        <p className="hint-text">
          Maximum {config.maxPlaylists} playlists. Tidal has a {config.trackLimit.toLocaleString()} track limit per playlist.
        </p>
        <div style={{ marginTop: '1rem', textAlign: 'left' }}>
          <button 
            className="view-all-playlists-btn" 
            onClick={() => setShowMyPlaylistsModal(true)}
            disabled={loading || playlists.length >= config.maxPlaylists}
          >
            Browse My Playlists
          </button>
        </div>
      </div>

      {playlists.length > 0 && (
        <>
          <div className="playlists-header">
            <h2>Added Playlists ({playlists.length})</h2>
            <button onClick={onClear} className="clear-button">
              Clear & Start Over
            </button>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={playlists.slice(0, 6).map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="playlist-grid">
                {playlists.slice(0, 6).map(playlist => (
                  <SortablePlaylist
                    key={playlist.id}
                    id={playlist.id}
                    name={playlist.name}
                    trackCount={playlist.trackCount}
                    coverUrl={playlist.coverUrl}
                    fallbackCovers={playlist.fallbackCovers}
                    selected={selectedIds.has(playlist.id)}
                    onToggle={() => handleTogglePlaylist(playlist.id)}
                    onRemove={() => handleRemovePlaylist(playlist.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {playlists.length > 6 && (
            <div className="view-all-container">
              <button 
                className="view-all-playlists-btn"
                onClick={() => setShowAllPlaylistsModal(true)}
              >
                View All {playlists.length} Playlists
              </button>
            </div>
          )}
        </>
      )}

      <div className="merge-section">
        <div className="input-group">
          <label>New Playlist Name</label>
          <input 
            type="text" 
            placeholder="e.g. My Ultimate Mix" 
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div className="option-row">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={deepClean}
              onChange={(e) => setDeepClean(e.target.checked)}
              disabled={loading}
            />
            <span className="checkbox-text">Deep Clean</span>
            <span className="tooltip-trigger">?</span>
            <span className="tooltip-text">
              Also remove duplicate songs within the same playlist, not just across playlists
            </span>
          </label>
        </div>
        
        <button 
          className="merge-button"
          onClick={onMerge} 
          disabled={loading || selectedIds.size < 2}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Processing...
            </>
          ) : 'Merge Playlists'}
        </button>
      </div>
      
      <footer className="github-footer">
        <a 
          href="https://github.com/Zephurlbr" 
          target="_blank" 
          rel="noopener noreferrer"
          className="github-link"
          aria-label="View on GitHub"
        >
          <svg viewBox="0 0 24 24" className="github-icon" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </footer>
    </div>
  );
}

export default App;
