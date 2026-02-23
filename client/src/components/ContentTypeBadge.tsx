import type { ContentType } from '../types';

interface ContentTypeBadgeProps {
  type: ContentType;
  size?: 'small' | 'medium';
}

const CONTENT_TYPE_CONFIG: Record<ContentType, { icon: string; label: string; color: string }> = {
  favorites: { icon: '❤️', label: 'Favorites', color: '#e74c3c' },
  playlist: { icon: '🎵', label: 'Playlist', color: '#3498db' },
  album: { icon: '💿', label: 'Album', color: '#9b59b6' },
  mix: { icon: '🎲', label: 'Mix', color: '#f39c12' },
};

function ContentTypeBadge({ type, size = 'small' }: ContentTypeBadgeProps) {
  const config = CONTENT_TYPE_CONFIG[type] || CONTENT_TYPE_CONFIG.playlist;
  const { icon, label, color } = config;

  return (
    <span 
      className={`content-type-badge ${size}`}
      style={{ '--badge-color': color } as React.CSSProperties}
    >
      <span className="badge-icon">{icon}</span>
      <span className="badge-label">{label}</span>
    </span>
  );
}

export default ContentTypeBadge;
