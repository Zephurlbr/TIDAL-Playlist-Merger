import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PlaylistPreview from './PlaylistPreview';

interface SortablePlaylistProps {
  id: string;
  name: string;
  trackCount: number | null;
  coverUrl: string | null;
  fallbackCovers: string[];
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

export function SortablePlaylist(props: SortablePlaylistProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PlaylistPreview {...props} />
    </div>
  );
}
