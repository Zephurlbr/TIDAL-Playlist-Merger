import type { Content } from '../types';
import ContentCover from './ContentCover';
import ContentTypeBadge from './ContentTypeBadge';

interface SearchDropdownProps {
  results: Content[];
  total: number;
  hasMore: boolean;
  onSelect: (content: Content) => void;
  onLoadMore: () => void;
  onClose: () => void;
  loading: boolean;
}

function SearchDropdown({ 
  results, 
  total, 
  hasMore, 
  onSelect, 
  onLoadMore, 
  onClose,
  loading 
}: SearchDropdownProps) {
  if (results.length === 0 && !loading) {
    return (
      <div className="search-dropdown">
        <div className="dropdown-header">
          <span>No results found</span>
          <button className="dropdown-close" onClick={onClose}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-dropdown">
      <div className="dropdown-header">
        <span>{total} result{total !== 1 ? 's' : ''}</span>
        <button className="dropdown-close" onClick={onClose}>×</button>
      </div>
      
      <div className="dropdown-results">
        {results.map((result) => (
          <div 
            key={`${result.contentType}-${result.id}`} 
            className="search-result-item"
            onClick={() => onSelect(result)}
          >
            <ContentCover content={result} size="small" />
            <div className="result-info">
              <span className="result-name">{result.name}</span>
              {result.artist && <span className="result-artist">{result.artist}</span>}
              <div className="result-meta">
                <ContentTypeBadge type={result.contentType} size="small" />
                <span className="result-count">{result.trackCount} track{result.trackCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <button className="add-btn" onClick={(e) => { e.stopPropagation(); onSelect(result); }}>
              Add
            </button>
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="dropdown-loading">
          <span className="loading-spinner small"></span>
          <span>Searching...</span>
        </div>
      )}
      
      {hasMore && !loading && (
        <button className="load-more-btn" onClick={onLoadMore}>
          Load More ({total - results.length} remaining)
        </button>
      )}
    </div>
  );
}

export default SearchDropdown;
