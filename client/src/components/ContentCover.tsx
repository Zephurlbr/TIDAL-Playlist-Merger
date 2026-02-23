import { useState } from 'react';
import type { Content } from '../types';

interface ContentCoverProps {
  content: Content;
  size?: 'small' | 'medium' | 'large';
}

function ContentCover({ content, size = 'medium' }: ContentCoverProps) {
  const [imageError, setImageError] = useState(false);
  
  const hasFallbacks = content.fallbackCovers && content.fallbackCovers.length > 0;
  const isFavorites = content.isFavorites;
  
  const sizeClasses = {
    small: 'cover-small',
    medium: 'cover-medium',
    large: 'cover-large'
  };
  
  if (isFavorites) {
    return (
      <div className={`content-cover favorites-cover ${sizeClasses[size]}`}>
        <div className="favorites-icon">❤️</div>
      </div>
    );
  }
  
  if (content.coverUrl && !imageError) {
    return (
      <div className={`content-cover ${sizeClasses[size]}`}>
        <img 
          src={content.coverUrl} 
          alt={content.name} 
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  if (hasFallbacks) {
    return (
      <div className={`content-cover cover-grid ${sizeClasses[size]}`}>
        {content.fallbackCovers.slice(0, 4).map((cover, index) => (
          <img key={index} src={cover} alt="" />
        ))}
      </div>
    );
  }
  
  return (
    <div className={`content-cover cover-placeholder ${sizeClasses[size]}`}>
      <span>{content.contentType === 'album' ? '💿' : content.contentType === 'mix' ? '🎲' : '🎵'}</span>
    </div>
  );
}

export default ContentCover;
