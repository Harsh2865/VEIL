export function LoadingState({ message = 'Loading URL history...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      <p>{message}</p>
    </div>
  );
}
