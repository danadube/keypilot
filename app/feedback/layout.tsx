import { TokenLinkBanner } from "@/components/public/TokenLinkBanner";

/**
 * Showing feedback — token-only public surface (FeedbackRequest).
 * No dashboard shell; Clerk must not gate /feedback/* (see middleware).
 */
export default function FeedbackTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <TokenLinkBanner title="Secure link · Showing feedback" />
      {children}
    </div>
  );
}
