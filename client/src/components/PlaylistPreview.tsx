import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Music, Check } from 'lucide-react';

/**
 * A single playlist card in the sortable grid.
 * Supports drag-and-drop reordering, selection toggling, and removal.
 * Shows cover art (single image, 4-tile mosaic, or placeholder icon).
 */

interface PlaylistPreviewProps {
  id: string;
  name: string;
  trackCount: number;
  trackCountLoading?: boolean;
  coverUrl: string | null;
  fallbackCovers: string[];
  selected: boolean;
  type?: 'playlist' | 'album' | 'mix' | 'favorites';
  onToggle: () => void;
  onRemove: () => void;
}

const PlaylistPreview = memo(function PlaylistPreview({
  id,
  name,
  trackCount,
  trackCountLoading,
  coverUrl,
  fallbackCovers,
  selected,
  type,
  onToggle,
  onRemove
}: PlaylistPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' as const : 'visible' as const,
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const hasFallbacks = fallbackCovers && fallbackCovers.length > 0;

  // When dragging, render only a ghost placeholder instead of the full card
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full h-20 bg-white/2 border-2 border-dashed border-white/10 rounded-xl"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-4 p-3 bg-white/5 border rounded-xl transition-all duration-300 hover:bg-white/10 hover:shadow-2xl
        ${selected ? 'border-tidal-yellow ring-4 ring-tidal-yellow/10' : 'border-white/10'}`}
    >
      {/* --- Cover Art (single / 4-tile mosaic / fallback icon) --- */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
        {coverUrl && !imageError ? (
          <img src={coverUrl} alt={name} className="w-full h-full object-cover" onError={handleImageError} />
        ) : hasFallbacks ? (
          <div className="grid grid-cols-2 grid-rows-2 gap-[1px] bg-white/5 w-full h-full">
            {fallbackCovers.slice(0, 4).map((cover, index) => (
              <img key={index} src={cover} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center text-tidal-yellow">
            <Music size={24} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <label className="flex items-center gap-3 cursor-pointer group/checkbox select-none" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="sr-only"
          />
          <div className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-200 border-2 shrink-0
            ${selected
              ? 'bg-tidal-yellow border-tidal-yellow shadow-[0_0_10px_rgba(255,220,0,0.3)]'
              : 'border-white/20 bg-transparent group-hover/checkbox:border-white/40'}`}
          >
            {selected && <Check size={14} className="text-black stroke-[4]" />}
          </div>
          <div className="min-w-0">
            <span className="block font-bold text-lg truncate">{name}</span>
            {/* Type badge with color coding: playlist/album/mix/favorites */}
            <div className="flex items-center gap-2 mt-1">
              {type && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${type === 'mix' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  type === 'album' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    type === 'favorites' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-tidal-yellow/10 text-tidal-yellow border-tidal-yellow/20'
                  }`}>
                  {type}
                </span>
              )}
              {trackCountLoading ? (
                <span className="text-xs text-text-muted italic">Loading count...</span>
              ) : (
                <span className="text-xs text-text-muted">{trackCount} tracks</span>
              )}
            </div>
          </div>
        </label>
      </div>

      {/* Drag handle (only area that triggers drag) */}
      <div
        className="p-2 -m-2 cursor-grab active:cursor-grabbing text-text-muted hover:text-white transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={20} />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-2 -m-2 text-text-muted hover:text-red-500 hover:scale-125 transition-all"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
});

export default PlaylistPreview;
