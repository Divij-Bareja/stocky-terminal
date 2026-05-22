export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-slate-400">Loading market data…</p>
    </div>
  );
}
