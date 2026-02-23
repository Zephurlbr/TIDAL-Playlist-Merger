import { useState, useEffect } from 'react';
import { configApi } from '../api';
import type { Config } from '../types';

export interface UseConfigReturn {
  config: Config;
  loading: boolean;
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<Config>({
    trackLimit: 10000,
    maxPlaylists: 200,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configApi.getConfig()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
