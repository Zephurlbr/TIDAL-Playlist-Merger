import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Music } from 'lucide-react';

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
        <label className="flex items-center gap-3 cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="w-5 h-5 accent-tidal-yellow cursor-pointer transition-transform hover:scale-110"
          />
          <div className="min-w-0">
            <span className="block font-bold text-lg truncate">{name}</span>
            <div className="flex items-center gap-2 mt-1">
              {type && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/70">
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

      <div
        className="p-2 -m-2 cursor-grab active:cursor-grabbing text-text-muted hover:text-white transition-colors opacity-0 group-hover:opacity-100"
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
        className="p-2 -m-2 text-text-muted hover:text-red-500 hover:scale-125 transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
});

export default PlaylistPreview;
