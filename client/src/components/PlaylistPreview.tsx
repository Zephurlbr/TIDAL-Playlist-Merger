import { useState } from 'react';

interface PlaylistPreviewProps {
  id: string;
  name: string;
  trackCount: number;
  coverUrl: string | null;
  fallbackCovers: string[];
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

function PlaylistPreview({
  name,
  trackCount,
  coverUrl,
  fallbackCovers,
  selected,
  onToggle,
  onRemove
}: PlaylistPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const hasFallbacks = fallbackCovers && fallbackCovers.length > 0;

  return (
    <div className={`playlist-preview ${selected ? 'selected' : ''}`}>
      <div className="preview-cover">
        {coverUrl && !imageError ? (
          <img src={coverUrl} alt={name} onError={handleImageError} />
        ) : hasFallbacks ? (
          <div className="cover-grid">
            {fallbackCovers.slice(0, 4).map((cover, index) => (
              <img key={index} src={cover} alt="" />
            ))}
          </div>
        ) : (
          <div className="cover-placeholder">🎵</div>
        )}
      </div>
      <div className="preview-info">
        <label>
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <div className="info-text">
            <span className="preview-name">{name}</span>
            <span className="preview-count">{trackCount} tracks</span>
          </div>
        </label>
      </div>
      <button className="remove-btn" onClick={onRemove}>×</button>
    </div>
  );
}

export default PlaylistPreview;
