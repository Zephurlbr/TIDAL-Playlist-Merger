import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import PlaylistPreview from './PlaylistPreview';
import PlaylistItem from './PlaylistItem';

import type { Playlist } from '../types';

interface AllPlaylistsModalProps {
  show: boolean;
  playlists: Playlist[];
  selectedIds: Set<string>;
  onClose: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder?: (newPlaylists: Playlist[]) => void;
}

export default function AllPlaylistsModal({
  show,
  playlists,
  selectedIds,
  onClose,
  onToggle,
  onRemove,
  onReorder
}: AllPlaylistsModalProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.type?.toLowerCase().includes(query)
    );
  }, [playlists, searchQuery]);

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

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = playlists.findIndex(p => p.id === active.id);
      const newIndex = playlists.findIndex(p => p.id === over.id);
      const newPlaylists = arrayMove(playlists, oldIndex, newIndex);
      onReorder(newPlaylists);
    }
  }, [playlists, onReorder]);

  const itemIds = useMemo(() => filteredPlaylists.map(p => p.id), [filteredPlaylists]);

  if (!show) return null;

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black tracking-tight text-white">All Playlists ({playlists.length})</h3>
            {isSearching && (
              <span className="text-xs text-text-muted">
                Found {filteredPlaylists.length} matches
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-text-muted hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="p-6 space-y-6 flex flex-col min-h-0 flex-1">
            <div className="relative flex items-center group">
              <div className="absolute left-4 text-text-muted group-focus-within:text-tidal-yellow transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search all Tidal playlists..."
                className="w-full bg-white/5 border border-white/10 focus:border-tidal-yellow/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(255,220,0,0.15)] rounded-xl py-2.5 px-4 pl-12 transition-all duration-300 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-1 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-all text-xl"
                >
                  ×
                </button>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={itemIds}
                strategy={verticalListSortingStrategy}
                disabled={isSearching}
              >
                <div className="playlists-list">
                  {filteredPlaylists.map(playlist => (
                    <PlaylistItem
                      key={playlist.id}
                      playlist={playlist}
                      selected={selectedIds.has(playlist.id)}
                      onToggle={onToggle}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{
                duration: 180,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}>
                {activeId ? (
                  (() => {
                    const playlist = playlists.find(p => p.id === activeId);
                    return playlist ? (
                      <div style={{
                        transform: 'scale(1.02)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                        borderRadius: '12px',
                        cursor: 'grabbing',
                        background: 'var(--tidal-gray)',
                      }}>
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
            {isSearching && filteredPlaylists.length === 0 && (
              <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl text-text-muted italic">
                No playlists found matching "{searchQuery}"
              </div>
            )}

            {!isSearching && playlists.length > 5 && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-text-muted text-center border border-white/5">
                Tip: Drag the handles to reorder. Merge order follows this list.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
