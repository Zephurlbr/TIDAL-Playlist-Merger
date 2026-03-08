import { useState, memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, Search, RefreshCw, CheckCircle2, Plus, Library } from 'lucide-react';
import type { Playlist } from '../types';

interface MyPlaylistsModalProps {
  show: boolean;
  myPlaylists: Playlist[];
  myPlaylistsLoading: boolean;
  playlists: Playlist[];
  onClose: () => void;
  onAddPlaylist: (playlist: Playlist) => void;
  onRefresh: (forceRefresh: boolean) => void;
}

const PlaylistItem = memo(function PlaylistItem({
  playlist,
  isAdded,
  onAdd
}: {
  playlist: Playlist;
  isAdded: boolean;
  onAdd: () => void;
}) {
  const hasFallbacks = playlist.fallbackCovers && playlist.fallbackCovers.length > 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-all group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : hasFallbacks ? (
            <div className="grid grid-cols-2 grid-rows-2 gap-[1px] bg-white/5 w-full h-full">
              {playlist.fallbackCovers.slice(0, 4).map((cover, index) => (
                <img key={index} src={cover} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center text-text-muted">
              <Library size={18} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-white truncate">{playlist.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {playlist.type && (
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${playlist.type === 'mix' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                playlist.type === 'album' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  playlist.type === 'favorites' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-tidal-yellow/10 text-tidal-yellow border-tidal-yellow/20'
                }`}>
                {playlist.type}
              </span>
            )}
            {playlist.trackCount !== null && (
              <span className="text-xs text-text-muted">{playlist.trackCount} tracks</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onAdd}
        disabled={isAdded}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
          ${isAdded
            ? 'bg-tidal-yellow/20 text-tidal-yellow cursor-default opacity-50'
            : 'bg-white/5 text-white hover:bg-tidal-yellow hover:text-tidal-black active:scale-95'}`}
      >
        {isAdded ? (
          <>
            <CheckCircle2 size={16} />
            <span>Added</span>
          </>
        ) : (
          <>
            <Plus size={16} />
            <span>Add</span>
          </>
        )}
      </button>
    </div>
  );
});

export default function MyPlaylistsModal({
  show,
  myPlaylists,
  myPlaylistsLoading,
  playlists,
  onClose,
  onAddPlaylist,
  onRefresh
}: MyPlaylistsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locallyAddedIds, setLocallyAddedIds] = useState<Set<string>>(new Set());
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  /**
   * Animated close: triggers exit animation, then calls onClose after 200ms.
   * This pattern is shared across all modals.
   */
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Focus management: trap focus inside the modal and restore on close
  useEffect(() => {
    if (!show) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);

    setTimeout(() => {
      const closeBtn = document.getElementById('myplaylists-modal-close');
      closeBtn?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      previousFocusRef.current?.focus();
    };
  }, [show]);

  const addedIds = useMemo(() => {
    const propIds = new Set(playlists.map(p => p.id));
    const combined = new Set(propIds);
    locallyAddedIds.forEach(id => combined.add(id));
    return combined;
  }, [playlists, locallyAddedIds]);

  const handleAddPlaylist = useCallback((playlist: Playlist) => {
    if (addedIds.has(playlist.id)) return;

    setLocallyAddedIds(prev => new Set(prev).add(playlist.id));
    onAddPlaylist(playlist);
  }, [addedIds, onAddPlaylist]);

  const filteredPlaylists = useMemo(() =>
    myPlaylists.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [myPlaylists, searchQuery]
  );

  if (!show && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="myplaylists-modal-title"
    >
      <div
        className={`w-full max-w-2xl bg-tidal-gray border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] ${isClosing ? 'animate-slide-down-out' : 'animate-slide-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 id="myplaylists-modal-title" className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <Library className="text-tidal-yellow" size={24} />
            My Playlists
          </h3>
          <button
            id="myplaylists-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-2 -m-2 text-text-muted hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex flex-col min-h-0 flex-1">
          <div className="relative flex items-center group">
            <Search className="absolute left-4 text-text-muted group-focus-within:text-tidal-yellow transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search your playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-tidal-yellow/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(255,220,0,0.15)] rounded-xl py-2.5 px-4 pl-12 transition-all duration-300 outline-none"
            />
            <div className="absolute right-4 flex items-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-1 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => onRefresh(true)}
                disabled={myPlaylistsLoading}
                aria-label="Refresh library"
                className={`p-2 hover:bg-white/10 rounded-lg text-text-muted hover:text-tidal-yellow transition-all
                  ${myPlaylistsLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer animate-none'}`}
              >
                <RefreshCw size={18} className={myPlaylistsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            {myPlaylistsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-white/5 border-t-tidal-yellow rounded-full animate-spin"></div>
                <p className="text-text-muted font-medium italic">Loading your TIDAL library...</p>
              </div>
            ) : myPlaylists.length === 0 ? (
              <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                <p className="text-text-muted italic">No playlists found in your library.</p>
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl text-text-muted italic">
                No playlists match "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPlaylists.map(playlist => (
                  <PlaylistItem
                    key={playlist.id}
                    playlist={playlist}
                    isAdded={addedIds.has(playlist.id)}
                    onAdd={() => handleAddPlaylist(playlist)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/2">
          <button
            onClick={handleClose}
            className="w-full btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
