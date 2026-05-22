export default function ErrorMessage({ message, onRetry }) {
  return (
    <div
      className="rounded-xl border border-red-500/30 bg-red-950/40 px-6 py-8 text-center"
      role="alert"
    >
      <p className="font-medium text-red-300">Failed to load stocks</p>
      <p className="mt-2 text-sm text-red-400/90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/30"
        >
          Retry
        </button>
      )}
    </div>
  );
}
