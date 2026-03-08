import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Copy, CheckCircle2, Music, Check } from 'lucide-react';
import type { MergeResult } from '../types';

interface DuplicatesModalProps {
    show: boolean;
    mergeResult: MergeResult | null;
    onClose: () => void;
}

export default function DuplicatesModal({ show, mergeResult, onClose }: DuplicatesModalProps) {
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    /** Copy track info to clipboard and show a brief ✓ checkmark */
    const handleCopy = useCallback((text: string, index: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    }, []);

    /** Animated close: triggers exit animation, then calls onClose after 200ms */
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    useEffect(() => {
        if (!show) return;

        previousFocusRef.current = document.activeElement as HTMLElement;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };

        document.addEventListener('keydown', handleEscape);

        setTimeout(() => {
            const closeBtn = document.getElementById('duplicates-modal-close');
            closeBtn?.focus();
        }, 0);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            previousFocusRef.current?.focus();
        };
    }, [show]);

    if (!show && !isClosing) return null;
    if (show && !mergeResult) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicates-modal-title"
        >
            <div
                className={`w-full max-w-2xl bg-tidal-gray border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] ${isClosing ? 'animate-slide-down-out' : 'animate-slide-up'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-tidal-yellow" size={24} />
                        <h3 id="duplicates-modal-title" className="text-xl font-black tracking-tight text-tidal-yellow">
                            Merge Complete
                        </h3>
                    </div>
                    <button
                        id="duplicates-modal-close"
                        onClick={handleClose}
                        aria-label="Close modal"
                        className="p-2 -m-2 text-text-muted hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-widest mb-1">Duplicates Removed</p>
                        <p className="text-4xl font-black text-tidal-yellow">{mergeResult?.duplicatesRemoved ?? 0}</p>
                    </div>

                    {mergeResult?.duplicates && mergeResult.duplicates.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-text-muted uppercase tracking-widest px-1">Removed Tracks</h4>
                            <div className="space-y-2">
                                {mergeResult.duplicates.map((track, index) => (
                                    <div key={index} className="flex items-center gap-4 p-3 bg-white/2 border border-white/5 rounded-lg group hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 bg-white/5 rounded overflow-hidden flex items-center justify-center text-text-muted group-hover:text-tidal-yellow transition-colors shrink-0">
                                            {track.coverUrl ? (
                                                <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Music size={20} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-white truncate">{track.name}</p>
                                            <p className="text-xs text-text-muted truncate mb-1">{track.artist}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(Array.isArray(track.appearedIn) ? track.appearedIn : [track.appearedIn]).map((source, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/60 border border-white/5 uppercase tracking-wider">
                                                        {source}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(`${track.name} - ${track.artist}`, index)}
                                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-text-muted hover:text-white"
                                                title="Copy track info"
                                            >
                                                {copiedIndex === index ? (
                                                    <Check size={14} className="text-tidal-yellow" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/2">
                    <button
                        onClick={handleClose}
                        className="w-full btn-primary"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
