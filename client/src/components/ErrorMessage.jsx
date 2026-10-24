import { AlertIcon } from './Icons.jsx';

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-content">
        <AlertIcon className="error-icon" />
        <p className="error-text">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-retry">
          Retry
        </button>
      )}
    </div>
  );
}
