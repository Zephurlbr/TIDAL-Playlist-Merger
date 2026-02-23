import { useState } from 'react';
import type { ContentType } from '../types';
import ContentTypeBadge from './ContentTypeBadge';

interface PlaylistPreviewProps {
  id: string;
  name: string;
  trackCount: number;
  coverUrl: string | null;
  fallbackCovers: string[];
  contentType: ContentType;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  isFavorites?: boolean;
}

function PlaylistPreview({
  name,
  trackCount,
  coverUrl,
  fallbackCovers,
  contentType,
  selected,
  isFavorites,
  onToggle,
  onRemove
}: PlaylistPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const hasFallbacks = fallbackCovers && fallbackCovers.length > 0;

  return (
    <div className={`playlist-preview ${selected ? 'selected' : ''} ${isFavorites ? 'is-favorites' : ''}`}>
      <div className="preview-cover">
        {isFavorites ? (
          <div className="favorites-cover-icon">❤️</div>
        ) : coverUrl && !imageError ? (
          <img src={coverUrl} alt={name} onError={handleImageError} />
        ) : hasFallbacks ? (
          <div className="cover-grid">
            {fallbackCovers.slice(0, 4).map((cover, index) => (
              <img key={index} src={cover} alt="" />
            ))}
          </div>
        ) : (
          <div className="cover-placeholder">
            {contentType === 'album' ? '💿' : contentType === 'mix' ? '🎲' : '🎵'}
          </div>
        )}
      </div>
      <div className="preview-info">
        <label>
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <div className="info-text">
            <span className="preview-name">{name}</span>
            <div className="preview-meta">
              <ContentTypeBadge type={contentType} size="small" />
              <span className="preview-count">{trackCount} tracks</span>
            </div>
          </div>
        </label>
      </div>
      <button className="remove-btn" onClick={onRemove}>×</button>
    </div>
  );
}

export default PlaylistPreview;
