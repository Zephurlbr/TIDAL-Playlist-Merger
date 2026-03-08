import { memo, useCallback } from 'react';
import PlaylistPreview from './PlaylistPreview';
import type { Playlist } from '../types';

interface PlaylistItemProps {
    playlist: Playlist;
    selected: boolean;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
}

const PlaylistItem = memo(function PlaylistItem({
    playlist,
    selected,
    onToggle,
    onRemove
}: PlaylistItemProps) {
    const handleToggle = useCallback(() => onToggle(playlist.id), [onToggle, playlist.id]);
    const handleRemove = useCallback(() => onRemove(playlist.id), [onRemove, playlist.id]);

    return (
        <PlaylistPreview
            id={playlist.id}
            name={playlist.name}
            trackCount={playlist.trackCount}
            coverUrl={playlist.coverUrl}
            fallbackCovers={playlist.fallbackCovers}
            selected={selected}
            type={playlist.type}
            trackCountLoading={playlist.trackCountLoading}
            onToggle={handleToggle}
            onRemove={handleRemove}
        />
    );
});

export default PlaylistItem;
