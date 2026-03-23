type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorMessage({
  message,
  onRetry,
  retryLabel = "Try again",
}: ErrorMessageProps) {
  return (
    <div className="min-h-[120px] rounded-lg border border-red-500/20 bg-red-500/10 p-4">
      <p className="text-sm font-medium text-red-400">{message}</p>
      {onRetry && (
        <button
          className="mt-3 rounded-md border border-red-500/20 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
