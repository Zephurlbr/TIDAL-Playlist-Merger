import { describe, it, expect } from 'vitest';
import { validatePlaylistUrl } from '../utils/urlValidator';

describe('validatePlaylistUrl', () => {
  it('validates listen.tidal.com URL', () => {
    const result = validatePlaylistUrl('https://listen.tidal.com/playlist/abc123-def456');
    expect(result.valid).toBe(true);
  });

  it('validates tidal.com/browse URL', () => {
    const result = validatePlaylistUrl('https://tidal.com/browse/playlist/abc123-def456');
    expect(result.valid).toBe(true);
  });

  it('validates raw UUID', () => {
    const result = validatePlaylistUrl('abc123de-f456-7890-abcd-ef1234567890');
    expect(result.valid).toBe(true);
  });

  it('validates raw playlist ID', () => {
    const result = validatePlaylistUrl('abc123-def456-ghi789-jkl012');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = validatePlaylistUrl('https://example.com/playlist/123');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects empty input', () => {
    const result = validatePlaylistUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a playlist URL or ID');
  });

  it('rejects whitespace only input', () => {
    const result = validatePlaylistUrl('   ');
    expect(result.valid).toBe(false);
  });
});
