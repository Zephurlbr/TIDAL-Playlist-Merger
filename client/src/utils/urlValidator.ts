const PATTERNS = [
  /listen\.tidal\.com\/playlist\/([a-zA-Z0-9-]+)/i,
  /tidal\.com\/.*playlist\/([a-zA-Z0-9-]+)/i,
  /open\.tidal\.com\/playlist\/([a-zA-Z0-9-]+)/i,
  /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i,
  /^([a-zA-Z0-9-]{20,})$/,
  // Albums
  /tidal\.com\/album\/[0-9]+/i,
  /listen\.tidal\.com\/album\/[0-9]+/i,
  // Mixes
  /tidal\.com\/mix\/[a-zA-Z0-9-]+/i,
  /listen\.tidal\.com\/mix\/[a-zA-Z0-9-]+/i,
];

export function validatePlaylistUrl(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Please enter a playlist URL or ID' };
  }

  for (const pattern of PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: true };
    }
  }

  return { valid: false, error: 'Please check the URL format' };
}
