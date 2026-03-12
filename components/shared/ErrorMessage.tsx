import { Button } from "@/components/ui/button";

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
    <div className="min-h-[120px] rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4">
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
