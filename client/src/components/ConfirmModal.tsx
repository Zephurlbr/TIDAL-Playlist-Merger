import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/40 animate-fade-in">
      <div
        className="w-full max-w-md bg-tidal-gray border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            {danger && <AlertTriangle className="text-red-500" size={24} />}
            <h3 className="text-xl font-black tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 -m-2 text-text-muted hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-text-muted leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 p-6 bg-white/2">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-extrabold py-3 px-6 rounded-xl transition-all duration-300 active:scale-95 shadow-lg
              ${danger
                ? 'bg-red-500 text-white hover:bg-red-600 hover:shadow-red-500/20'
                : 'bg-tidal-yellow text-tidal-black hover:scale-[1.02] hover:-translate-y-1 hover:shadow-tidal-yellow/20'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
