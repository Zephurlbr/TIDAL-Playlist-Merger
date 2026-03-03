import { X, Copy, CheckCircle2, Music } from 'lucide-react';
import type { MergeResult } from '../hooks/useMerge';

interface DuplicatesModalProps {
    show: boolean;
    mergeResult: MergeResult | null;
    onClose: () => void;
}

export default function DuplicatesModal({ show, mergeResult, onClose }: DuplicatesModalProps) {
    if (!show || !mergeResult) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/40 animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-tidal-gray border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-tidal-yellow" size={24} />
                        <h3 className="text-xl font-black tracking-tight text-tidal-yellow">
                            Merge Complete
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -m-2 text-text-muted hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <p className="text-text-muted text-sm font-medium uppercase tracking-widest mb-1">Duplicates Removed</p>
                        <p className="text-4xl font-black text-white">{mergeResult.duplicatesRemoved}</p>
                    </div>

                    {mergeResult.duplicates && mergeResult.duplicates.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-text-muted uppercase tracking-widest px-1">Removed Tracks</h4>
                            <div className="space-y-2">
                                {mergeResult.duplicates.map((track, index) => (
                                    <div key={index} className="flex items-center gap-4 p-3 bg-white/2 border border-white/5 rounded-lg group hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-text-muted group-hover:text-tidal-yellow transition-colors shrink-0">
                                            <Music size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white truncate">{track.name}</p>
                                            <p className="text-xs text-text-muted truncate">{track.artist}</p>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} className="text-text-muted" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/2">
                    <button
                        onClick={onClose}
                        className="w-full btn-primary"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
