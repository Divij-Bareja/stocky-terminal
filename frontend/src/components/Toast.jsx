import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onDismiss, durationMs = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  const styles =
    type === 'success'
      ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100'
      : 'border-red-500/40 bg-red-950/90 text-red-100';

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg shadow-black/40 backdrop-blur transition-all duration-300 ${styles}`}
    >
      {type === 'success' ? (
        <svg className="h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
