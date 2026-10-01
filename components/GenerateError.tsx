export default function GenerateError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-4 flex items-center justify-between gap-4 rounded-btn border border-danger/30 bg-danger/10 px-4 py-3 text-[15px]">
      <span>{message}</span>
      <button type="button" className="btn-secondary shrink-0" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}
