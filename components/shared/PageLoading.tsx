import { LoadingSpinner } from "./LoadingSpinner";

export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-12">
      <LoadingSpinner className="h-8 w-8 text-kp-on-surface-variant" />
      <p className="text-sm text-kp-on-surface-variant">{message}</p>
    </div>
  );
}
