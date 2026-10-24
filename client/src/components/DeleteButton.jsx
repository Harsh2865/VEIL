import { useState } from 'react';
import { TrashIcon } from './Icons.jsx';

export function DeleteButton({ onDelete, label = 'Delete', disabled = false }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="delete-confirm-box" role="alertdialog" aria-label="Confirm link deletion">
        <span className="confirm-text">Delete link?</span>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn-delete-confirm"
            onClick={handleConfirm}
            disabled={isDeleting || disabled}
            aria-label="Confirm deletion"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setIsConfirming(false)}
            disabled={isDeleting || disabled}
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn-delete"
      onClick={() => setIsConfirming(true)}
      disabled={disabled}
      aria-label="Delete this shortened URL"
    >
      <TrashIcon className="icon-state" />
      <span>{label}</span>
    </button>
  );
}
