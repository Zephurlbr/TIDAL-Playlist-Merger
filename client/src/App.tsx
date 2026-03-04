import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  LogOut,
  Music,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Info,
  X,
  Layers,
  Merge,
  FolderPen
} from 'lucide-react';
import AddPlaylistInput from './components/AddPlaylistInput';
import PlaylistPreview from './components/PlaylistPreview';
import PlaylistItem from './components/PlaylistItem';
import MyPlaylistsModal from './components/MyPlaylistsModal';
import ConfirmModal from './components/ConfirmModal';
import DuplicatesModal from './components/DuplicatesModal';
import { useAuth } from './hooks/useAuth';
import { useMerge, type DedupeMode } from './hooks/useMerge';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const MAX_PLAYLISTS = 200;

import type { Playlist } from './types';

function App() {
  const {
    loginUrl,
    userCode,
    authError,
    setAuthError,
    login,
    logout,
    cancelLogin,
    isAuthenticated
  } = useAuth();

  const {
    loading,
    status,
    statusType,
    mergeSuccess,
    mergeResult,
    merge,
    clearMergeState
  } = useMerge();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showMyPlaylistsModal, setShowMyPlaylistsModal] = useState(false);
  const [dedupeMode, setDedupeMode] = useState<DedupeMode>('off');
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [myPlaylistsLoaded, setMyPlaylistsLoaded] = useState(false);
  const [myPlaylistsLoading, setMyPlaylistsLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playlistResetKey, setPlaylistResetKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const isSearching = searchQuery.trim().length > 0;

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.type?.toLowerCase().includes(query)
    );
  }, [playlists, searchQuery]);

  useEffect(() => {
    if (isAuthenticated && !myPlaylistsLoaded) {
      fetchMyPlaylists();
    }
  }, [isAuthenticated, myPlaylistsLoaded]);

  useEffect(() => {
    const playlistIds = new Set(playlists.map(p => p.id));
    const orphanSelections = [...selectedIds].filter(id => !playlistIds.has(id));

    if (orphanSelections.length > 0) {
      console.error('State desync: selectedIds contains orphaned IDs:', orphanSelections);
      setSelectedIds(prev => {
        const next = new Set(prev);
        orphanSelections.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [playlists, selectedIds]);

  const handleAddPlaylist = async (url: string) => {
    setAuthError(null);
    const response = await axios.post(`${API_BASE}/api/playlist/resolve`, { url }, { timeout: 10000 });
    const playlist = response.data;

    if (playlists.find(p => p.id === playlist.id)) {
      throw new Error(`"${playlist.name}" is already in your list`);
    }

    setPlaylists(prev => [playlist, ...prev]);
    setSelectedIds(prev => new Set(prev).add(playlist.id));
    clearMergeState();
  };

  const handleRemovePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    clearMergeState();
  }, [clearMergeState]);

  const handleTogglePlaylist = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    clearMergeState();
  }, [clearMergeState]);

  const handleClear = () => {
    setPlaylists([]);
    setSelectedIds(new Set());
    setNewPlaylistName('');
    clearMergeState();
    setShowDuplicatesModal(false);
    setDedupeMode('off');
    setPlaylistResetKey(prev => prev + 1);
  };

  const handleMerge = async () => {
    const selectedList = playlists.filter(p => selectedIds.has(p.id)).map(p => p.id);
    await merge(selectedList, newPlaylistName, dedupeMode);
  };

  const handleLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
    setPlaylists([]);
    setSelectedIds(new Set());
    clearMergeState();
    setDedupeMode('off');
    setMyPlaylists([]);
    setMyPlaylistsLoaded(false);
  };

  const handleCancelLogin = () => {
    cancelLogin();
  };

  const handleAddFromModal = (playlist: Playlist) => {
    setPlaylists(prev => [playlist, ...prev]);
    setSelectedIds(prev => new Set(prev).add(playlist.id));
    clearMergeState();
  };

  const fetchMyPlaylists = async (forceRefresh = false) => {
    if (!forceRefresh && myPlaylistsLoaded) return;

    setMyPlaylistsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/me/playlists`);
      const playlistsWithLoading = response.data.playlists;

      const favoritesWithLoading = playlistsWithLoading.find((p: Playlist) => p.id === 'my-favorites' && p.trackCountLoading);

      if (favoritesWithLoading) {
        try {
          const countResponse = await axios.get(`${API_BASE}/api/me/favorites/count`);
          const actualCount = countResponse.data.count;

          const updatedPlaylists = playlistsWithLoading.map((p: Playlist) =>
            p.id === 'my-favorites'
              ? { ...p, trackCount: actualCount, trackCountLoading: false }
              : p
          );
          setMyPlaylists(updatedPlaylists);
        } catch (countErr) {
          console.error('Failed to load favorites count:', countErr);
          setMyPlaylists(playlistsWithLoading);
        }
      } else {
        setMyPlaylists(playlistsWithLoading);
      }

      setMyPlaylistsLoaded(true);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setMyPlaylistsLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: { active: { id: string | number }; }) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setPlaylists((prev) => {
        const oldIndex = prev.findIndex(p => p.id === active.id);
        const newIndex = prev.findIndex(p => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center animate-fade-in">
          <div className="glass-panel text-center">
            <h1 className="text-7xl font-black tracking-tight mb-4 pb-2 bg-linear-to-r from-white to-tidal-yellow bg-clip-text text-transparent">
              TIDAL Playlist Merger
            </h1>
            <p className="text-2xl text-text-muted mb-12 font-medium">Consolidate your music library seamlessly.</p>

            {authError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-3 text-red-500 animate-slide-down">
                <AlertCircle size={20} />
                <span>{authError}</span>
              </div>
            )}

            {!loginUrl ? (
              <button onClick={handleLogin} className="btn-primary flex items-center gap-3 mx-auto cursor-pointer">
                <Music size={20} />
                Connect with TIDAL
              </button>
            ) : (
              <div className="space-y-6">
                <p className="text-lg">Waiting for authorization...</p>
                {userCode && (
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl inline-block">
                    <span className="text-sm text-text-muted uppercase tracking-widest block mb-2">Your Code</span>
                    <p className="text-4xl font-black tracking-widest">{userCode}</p>
                  </div>
                )}
                <a
                  href={loginUrl.startsWith('http') ? loginUrl : `https://${loginUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-3 mx-auto w-fit"
                >
                  Open TIDAL <ExternalLink size={18} />
                </a>
                <p className="text-sm text-text-muted opacity-70">
                  This page will automatically update once authorized.
                </p>
                <button onClick={handleCancelLogin} className="btn-secondary cursor-pointer">
                  Cancel
                </button>
              </div>
            )}
          </div>

          <footer className="mt-12 flex justify-center">
            <a
              href="https://github.com/Zephurlbr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-white transition-colors p-3 hover:bg-white/5 rounded-full"
              aria-label="View on GitHub"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 animate-fade-in">
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <DuplicatesModal
          show={showDuplicatesModal}
          mergeResult={mergeResult}
          onClose={() => setShowDuplicatesModal(false)}
        />
        <ConfirmModal
          show={showClearConfirmModal}
          title="Clear All Playlists?"
          message={`This will remove all ${playlists.length} playlists from your selection.`}
          confirmLabel="Clear All"
          cancelLabel="Cancel"
          onConfirm={() => {
            handleClear();
            setShowClearConfirmModal(false);
          }}
          onCancel={() => setShowClearConfirmModal(false)}
          danger
        />
        <MyPlaylistsModal
          key={`my-playlists-${playlistResetKey}`}
          show={showMyPlaylistsModal}
          myPlaylists={myPlaylists}
          myPlaylistsLoading={myPlaylistsLoading}
          playlists={playlists}
          onClose={() => setShowMyPlaylistsModal(false)}
          onAddPlaylist={handleAddFromModal}
          onRefresh={fetchMyPlaylists}
        />

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            <h1 className="text-6xl font-black tracking-tight mb-2 pb-2 bg-linear-to-r from-white to-tidal-yellow bg-clip-text text-transparent">
              TIDAL Playlist Merger
            </h1>
            <p className="text-xl text-text-muted font-medium">Consolidate your music library.</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 cursor-pointer">
            <LogOut size={16} />
            Logout
          </button>
        </header>

        {status && (
          <div className={`mb-8 p-5 bg-white/5 backdrop-blur-md border rounded-2xl flex items-center justify-between gap-4 animate-slide-down
          ${statusType === 'error' ? 'border-red-500/30 text-red-400' : 'border-tidal-yellow/20 text-tidal-yellow'}
          ${mergeSuccess ? 'animate-pulse-glow border-tidal-yellow/50' : ''}`}>
            <div className="flex items-center gap-3">
              {mergeSuccess ? <CheckCircle2 size={24} /> : <Info size={24} />}
              <span className="font-medium text-lg">{status}</span>
            </div>
            {mergeSuccess && mergeResult && mergeResult.duplicatesRemoved > 0 && (
              <button
                className="text-sm font-bold bg-white/10 hover:bg-white/20 py-2 px-4 rounded-lg transition-colors cursor-pointer"
                onClick={() => setShowDuplicatesModal(true)}
              >
                View Duplicates
              </button>
            )}
          </div>
        )}

        <section className="glass-panel mb-8 p-6 sm:p-8">
          <AddPlaylistInput
            onAdd={handleAddPlaylist}
            disabled={loading}
            maxReached={playlists.length >= MAX_PLAYLISTS}
          />
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="text-sm font-bold text-text-muted tracking-widest uppercase shrink-0">OR</span>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>
          <button
            className="max-w-lg mx-auto flex justify-center btn-outline-yellow text-base transition-all cursor-pointer border-solid"
            onClick={() => setShowMyPlaylistsModal(true)}
            disabled={loading || playlists.length >= MAX_PLAYLISTS}
          >
            Browse My Playlists
          </button>
        </section>

        {playlists.length > 0 && (
          <section className="mb-12 animate-fade-in">
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 group">
                  <h2 className="text-2xl font-black tracking-tight">Added Playlists ({playlists.length})</h2>
                  <div className="relative">
                    <Info size={16} className="text-text-muted hover:text-tidal-yellow cursor-help" tabIndex={0} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-tidal-gray border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all z-20 text-sm text-center">
                      Playlist order affects the merge order. Drag items to reorder.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearConfirmModal(true)}
                  className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 py-2 px-4 hover:bg-red-500/10 rounded-lg cursor-pointer"
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>

              <div className="relative flex items-center group">
                <Search className="absolute left-4 text-text-muted group-focus-within:text-tidal-yellow transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search your playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-tidal-yellow/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(255,220,0,0.15)] rounded-xl py-2.5 px-4 pl-12 pr-12 transition-all duration-300 outline-none text-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 p-1 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-all scale-100 hover:scale-110 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {isSearching && (
                <span className="text-sm text-text-muted animate-fade-in italic">
                  Found {filteredPlaylists.length} matches
                </span>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredPlaylists.map(p => p.id)}
                strategy={rectSortingStrategy}
                disabled={isSearching}
              >
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredPlaylists.map(playlist => (
                    <PlaylistItem
                      key={playlist.id}
                      playlist={playlist}
                      selected={selectedIds.has(playlist.id)}
                      onToggle={handleTogglePlaylist}
                      onRemove={handleRemovePlaylist}
                    />
                  ))}
                </div>
              </SortableContext>

              {isSearching && filteredPlaylists.length === 0 && (
                <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl text-text-muted italic">
                  No playlists found matching "{searchQuery}"
                </div>
              )}

              <DragOverlay dropAnimation={{
                duration: 180,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}>
                {activeId ? (
                  (() => {
                    const playlist = playlists.find(p => p.id === activeId);
                    return playlist ? (
                      <div className="shadow-2xl scale-[1.03] ring-2 ring-tidal-yellow/50 rounded-xl opacity-90 cursor-grabbing bg-tidal-gray overflow-hidden">
                        <PlaylistPreview
                          id={playlist.id}
                          name={playlist.name}
                          trackCount={playlist.trackCount}
                          coverUrl={playlist.coverUrl}
                          fallbackCovers={playlist.fallbackCovers}
                          selected={selectedIds.has(playlist.id)}
                          type={playlist.type}
                          onToggle={() => { }}
                          onRemove={() => { }}
                        />
                      </div>
                    ) : null;
                  })()
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>
        )}

        <section className="glass-panel p-6 sm:p-8 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <FolderPen size={22} className="text-tidal-yellow" />
              <label className="text-sm font-bold text-tidal-yellow uppercase tracking-[0.15em] opacity-80">New Playlist Name</label>
            </div>
            <div className="relative group">
              <input
                type="text"
                placeholder="e.g. My Ultimate Summer Mix"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 focus:border-tidal-yellow/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(255,220,0,0.15)] rounded-xl py-2.5 px-4 transition-all duration-300 outline-none text-lg"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Layers size={22} className="text-tidal-yellow" />
              <label className="text-sm font-bold text-tidal-yellow uppercase tracking-[0.15em] opacity-80">Duplicate removal mode</label>
            </div>

            <div className="relative flex max-w-md mx-auto bg-white/2 border border-white/5 rounded-2xl p-1 shadow-2xl backdrop-blur-md">
              <div
                style={{
                  width: 'calc(25% - 2px)',
                  left: `calc(${['off', 'inter', 'intra', 'full'].indexOf(dedupeMode) * 25}% + 1px)`,
                  height: 'calc(100% - 2px)',
                }}
                className="absolute top-[1px] bottom-[1px] bg-tidal-yellow rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(255,220,0,0.35)]"
              />

              {[
                { id: 'off', label: 'Off', desc: 'Keep all tracks' },
                { id: 'inter', label: 'Inter', desc: 'Remove duplicates between playlists' },
                { id: 'intra', label: 'Intra', desc: 'Remove duplicates within same playlist' },
                { id: 'full', label: 'Full', desc: 'Maximum cleanup (Both inter & intra)' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  tabIndex={0}
                  disabled={loading}
                  onClick={(e) => {
                    setDedupeMode(mode.id as DedupeMode);
                    (e.currentTarget as HTMLButtonElement).blur();
                  }}
                  className={`
                  group relative w-1/4 py-1.5 text-sm font-bold text-center flex items-center justify-center transition-all duration-300 z-10 rounded-xl
                  ${dedupeMode === mode.id ? 'text-tidal-black' : 'text-text-muted hover:text-white hover:bg-white/5'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                >
                  {mode.label}

                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 p-2.4 bg-tidal-gray border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all z-20">
                    <p className="text-xs leading-relaxed text-text-muted font-normal">
                      {mode.desc}
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-tidal-gray" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              className={`group flex items-center justify-center gap-3 btn-primary text-xl py-2.5 px-10 shadow-2xl transition-all duration-300 overflow-hidden
                ${loading || selectedIds.size < 2 || !newPlaylistName.trim()
                  ? 'opacity-30 grayscale cursor-not-allowed'
                  : 'bg-tidal-yellow border border-tidal-yellow/50 shadow-tidal-yellow/20 hover:shadow-tidal-yellow/40 active:scale-95'}`}
              onClick={handleMerge}
              disabled={loading || selectedIds.size < 2 || !newPlaylistName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Merging Playlists...
                </>
              ) : (
                <>
                  <span className="uppercase tracking-[0.15em] font-bold">Merge {selectedIds.size} Playlists</span>
                  <Merge size={20} className="rotate-90 transition-transform group-hover:translate-x-1.5" />
                </>
              )}
            </button>
          </div>
        </section>

        <footer className="mt-16 flex justify-center pb-12">
          <a
            href="https://github.com/Zephurlbr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-white transition-all duration-300 p-3 hover:bg-white/10 rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            aria-label="View on GitHub"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
