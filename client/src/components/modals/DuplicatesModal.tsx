import type { MergeResult } from '../../types';

interface DuplicatesModalProps {
  show: boolean;
  mergeResult: MergeResult | null;
  onClose: () => void;
}

function DuplicatesModal({ show, mergeResult, onClose }: DuplicatesModalProps) {
  if (!show || !mergeResult) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Duplicate Tracks</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {mergeResult.totalDuplicateTracks > mergeResult.duplicates.length && (
            <p className="modal-note">
              Showing {mergeResult.duplicates.length} of {mergeResult.totalDuplicateTracks} duplicates
            </p>
          )}
          <div className="duplicates-list">
            {mergeResult.duplicates.map((dup, index) => (
              <div key={index} className="duplicate-item">
                <div className="duplicate-track">
                  <span className="duplicate-name">{dup.name}</span>
                  <span className="duplicate-artist">{dup.artist}</span>
                </div>
                <div className="duplicate-playlists">
                  Appeared in: {Array.isArray(dup.appearedIn) ? dup.appearedIn.join(', ') : dup.appearedIn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DuplicatesModal;
