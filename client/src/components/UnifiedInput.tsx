import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import type { Content } from '../types';
import SearchDropdown from './SearchDropdown';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

interface UnifiedInputProps {
  onAdd: (content: Content) => Promise<void>;
  disabled: boolean;
  maxReached: boolean;
}

const URL_PATTERNS = [
  /listen\.tidal\.com\/(playlist|album|mix|track)\/([a-zA-Z0-9-]+)/i,
  /tidal\.com\/(playlist|album|mix|track)\/([a-zA-Z0-9-]+)/i,
];

const ID_PATTERNS = [
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
  /^\d{6,}$/,
  /^[a-zA-Z0-9]{20,}$/
];

function UnifiedInput({ onAdd, disabled, maxReached }: UnifiedInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isUrlOrId = (value: string): boolean => {
    for (const pattern of URL_PATTERNS) {
      if (pattern.test(value)) return true;
    }
    for (const pattern of ID_PATTERNS) {
      if (pattern.test(value)) return true;
    }
    return false;
  };
  
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);
  
  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (!value.trim()) {
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }
    
    debounceTimer.current = setTimeout(() => {
      handleInputDebounced(value.trim());
    }, 300);
  };
  
  const handleInputDebounced = async (value: string) => {
    if (isUrlOrId(value)) {
      await resolveAndAdd(value);
    } else {
      await performSearch(value, 0);
    }
  };
  
  const resolveAndAdd = async (inputValue: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/api/content/resolve`, { input: inputValue });
      
      if (response.data.type === 'search') {
        setSearchResults(response.data.results || []);
        setTotalResults(response.data.total || 0);
        setHasMore(response.data.hasMore || false);
        setShowDropdown(true);
      } else {
        await onAdd(response.data as Content);
        setInput('');
        setShowDropdown(false);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to resolve content');
    } finally {
      setLoading(false);
    }
  };
  
  const performSearch = async (query: string, offset: number) => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE}/api/search`, { 
        query, 
        limit: 10, 
        offset 
      });
      
      if (offset === 0) {
        setSearchResults(response.data.results || []);
      } else {
        setSearchResults(prev => [...prev, ...(response.data.results || [])]);
      }
      
      setTotalResults(response.data.total || 0);
      setHasMore(response.data.hasMore || false);
      setSearchOffset(offset);
      setShowDropdown(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadMore = () => {
    if (!input.trim()) return;
    performSearch(input.trim(), searchOffset + 10);
  };
  
  const handleSelectResult = async (content: Content) => {
    try {
      await onAdd(content);
      setInput('');
      setShowDropdown(false);
      setSearchResults([]);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to add content');
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    handleInputDebounced(input.trim());
  };
  
  const handleCloseDropdown = () => {
    setShowDropdown(false);
  };
  
  return (
    <div className="unified-input-container">
      <form onSubmit={handleSubmit}>
        <div className="input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste URL/ID or search for playlists & albums..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={disabled || loading}
            className={error ? 'input-error' : ''}
          />
          <button type="submit" disabled={disabled || loading || maxReached}>
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </form>
      
      {error && <span className="inline-error">{error}</span>}
      
      {maxReached && <span className="inline-warning">Maximum 200 items reached</span>}
      
      {showDropdown && (
        <SearchDropdown
          results={searchResults}
          total={totalResults}
          hasMore={hasMore}
          onSelect={handleSelectResult}
          onLoadMore={handleLoadMore}
          onClose={handleCloseDropdown}
          loading={loading}
        />
      )}
    </div>
  );
}

export default UnifiedInput;
