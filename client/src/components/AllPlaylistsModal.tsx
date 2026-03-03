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
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3>All Playlists ({playlists.length})</h3>
            {isSearching && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Found {filteredPlaylists.length} matches
              </span>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.9rem'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
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
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No playlists found matching "{searchQuery}"
            </div>
          )}
          {!isSearching && playlists.length > 5 && (
            <div className="modal-note" style={{ marginTop: '1rem' }}>
              Tip: Drag the handles to reorder. Merge order follows this list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
