import { useState, useEffect } from 'react';
import axios from 'axios';
import AddPlaylistInput from './components/AddPlaylistInput';
import PlaylistPreview from './components/PlaylistPreview';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const MAX_PLAYLISTS = 200;
const TRACK_LIMIT = 10000;

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  coverUrl: string | null;
  fallbackCovers: string[];
}

interface DuplicateTrack {
  name: string;
  artist: string;
  appearedIn: string[] | string;
  type?: 'cross' | 'intra';
}

interface MergeResult {
  id: string;
  trackCount: number;
  totalFetched: number;
  duplicatesRemoved: number;
  crossPlaylistDuplicates: number;
  intraPlaylistDuplicates: number;
  playlistCounts: number[];
  duplicates: DuplicateTrack[];
  totalDuplicateTracks: number;
  wasTruncated: boolean;
  truncatedCount: number;
}

type AuthState = 'idle' | 'checking' | 'polling' | 'authenticated' | 'error';

function App() {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showAllPlaylistsModal, setShowAllPlaylistsModal] = useState(false);
  const [deepClean, setDeepClean] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/status`, { timeout: 5000 });
        if (!isMounted) return;
        
        if (response.data.authenticated) {
          setAuthState('authenticated');
          setLoginUrl(null);
          setUserCode(null);
          setAuthError(null);
        } else if (authState === 'polling') {
          const checkResponse = await axios.get(`${API_BASE}/auth/check`, { timeout: 5000 });
          if (!isMounted) return;
          
          if (checkResponse.data.completed && checkResponse.data.authenticated) {
            setAuthState('authenticated');
            setLoginUrl(null);
            setUserCode(null);
            setAuthError(null);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Auth check failed', error);
        if (authState !== 'polling') {
          setAuthError('Unable to connect to server. Please ensure the backend is running.');
          setAuthState('error');
        }
      }
    };

    checkAuthStatus();

    if (authState === 'polling') {
      intervalId = setInterval(checkAuthStatus, 2000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [authState]);

  const isAuthenticated = authState === 'authenticated';

  const handleAddPlaylist = async (url: string) => {
    setAuthError(null);
    const response = await axios.post(`${API_BASE}/api/playlist/resolve`, { url }, { timeout: 10000 });
    const playlist = response.data;

    if (playlists.find(p => p.id === playlist.id)) {
      throw new Error('Playlist already added');
    }

    setPlaylists(prev => [playlist, ...prev]);
    setSelectedIds(prev => new Set(prev).add(playlist.id));
    setMergeSuccess(false);
    setMergeResult(null);
  };

  const handleRemovePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setMergeSuccess(false);
    setMergeResult(null);
  };

  const handleTogglePlaylist = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setMergeSuccess(false);
    setMergeResult(null);
  };

  const handleClear = () => {
    setPlaylists([]);
    setSelectedIds(new Set());
    setNewPlaylistName('');
    setMergeSuccess(false);
    setMergeResult(null);
    setStatus('');
    setShowDuplicatesModal(false);
    setDeepClean(false);
  };

  const handleMerge = async () => {
    const selectedPlaylists = playlists.filter(p => selectedIds.has(p.id));
    
    if (selectedPlaylists.length < 2) {
      setStatus('Please select at least 2 playlists to merge.');
      return;
    }
    if (!newPlaylistName.trim()) {
      setStatus('Please enter a name for your new merged playlist.');
      return;
    }

    setLoading(true);
    setStatus('Starting merge process...');
    setMergeResult(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistIds: selectedPlaylists.map(p => p.id),
          name: newPlaylistName.trim(),
          keepItTidy: deepClean
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
                setLoading(false);
                return;
              }
              
              if (data.complete && data.result) {
                const result = data.result as MergeResult;
                setMergeResult(result);
                
                let message = `Done! Created playlist with ${result.trackCount} tracks.`;
                if (result.duplicatesRemoved > 0) {
                  if (result.intraPlaylistDuplicates > 0 && deepClean) {
                    message += ` (${result.duplicatesRemoved} duplicates removed, including ${result.intraPlaylistDuplicates} within playlists)`;
                  } else {
                    message += ` (${result.duplicatesRemoved} duplicates removed)`;
                  }
                }
                if (result.wasTruncated) {
                  message += ` Note: Tidal limits playlists to ${TRACK_LIMIT.toLocaleString()} tracks - ${result.truncatedCount.toLocaleString()} additional tracks were not added.`;
                }
                setStatus(message);
                setLoading(false);
                setMergeSuccess(true);
                return;
              }
              
              if (data.progress !== undefined) {
                setStatus(`${data.message} (${Math.round(data.progress)}%)`);
              } else if (data.message) {
                setStatus(data.message);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Merge failed: ${message}`);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    try {
      const response = await axios.get(`${API_BASE}/auth/login`, { timeout: 10000 });
      setLoginUrl(response.data.login_url);
      setUserCode(response.data.user_code || '');
      setAuthState('polling');
    } catch (error) {
      console.error('Failed to initiate login', error);
      setAuthError('Failed to connect to TIDAL. Please try again.');
      setAuthState('error');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, { timeout: 5000 });
      setAuthState('idle');
      setLoginUrl(null);
      setUserCode(null);
      setPlaylists([]);
      setSelectedIds(new Set());
      setMergeSuccess(false);
      setMergeResult(null);
      setStatus('');
      setDeepClean(false);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const handleCancelLogin = () => {
    setLoginUrl(null);
    setUserCode(null);
    setAuthState('idle');
  };

  const DuplicatesModal = () => {
    if (!showDuplicatesModal || !mergeResult) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowDuplicatesModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Duplicate Tracks</h3>
            <button className="modal-close" onClick={() => setShowDuplicatesModal(false)}>×</button>
          </div>
          <div className="modal-body">
            {mergeResult.totalDuplicateTracks > mergeResult.duplicates.length && (
              <p className="modal-note">
                Showing {mergeResult.duplicates.length} of {mergeResult.totalDuplicateTracks} duplicates
              </p>
            )}
            <div className="duplicates-list">
              {mergeResult.duplicates.map((dup, index) => (
                <div key={index} className="duplicate-item">
                  <div className="duplicate-track">
                    <span className="duplicate-name">{dup.name}</span>
                    <span className="duplicate-artist">{dup.artist}</span>
                  </div>
                  <div className="duplicate-playlists">
                    Appeared in: {Array.isArray(dup.appearedIn) ? dup.appearedIn.join(', ') : dup.appearedIn}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AllPlaylistsModal = () => {
    if (!showAllPlaylistsModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowAllPlaylistsModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>All Playlists ({playlists.length})</h3>
            <button className="modal-close" onClick={() => setShowAllPlaylistsModal(false)}>×</button>
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
                  onToggle={() => handleTogglePlaylist(playlist.id)}
                  onRemove={() => handleRemovePlaylist(playlist.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
      <DuplicatesModal />
      <AllPlaylistsModal />
      
      <div className="header-row">
        <div>
          <h1>TIDAL Playlist Merger</h1>
          <p className="subtitle">Paste playlist links to merge them into one.</p>
        </div>
        <button onClick={handleLogout} className="logout-button">Logout</button>
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
          maxReached={playlists.length >= MAX_PLAYLISTS}
        />
<p className="hint-text">
          Maximum {MAX_PLAYLISTS} playlists. Tidal has a {TRACK_LIMIT.toLocaleString()} track limit per playlist.
        </p>
      </div>

      {playlists.length > 0 && (
        <>
          <div className="playlists-header">
            <h2>Added Playlists ({playlists.length})</h2>
            <button onClick={handleClear} className="clear-button">
              Clear & Start Over
            </button>
          </div>

          <div className="playlist-grid">
            {playlists.slice(0, 6).map(playlist => (
              <PlaylistPreview
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
          onClick={handleMerge} 
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
