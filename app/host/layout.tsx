import { TokenLinkBanner } from "@/components/public/TokenLinkBanner";

/**
 * Host console — token-only access via OpenHouseHostInvite.
 * Scoped to one open house; no dashboard shell (see middleware public routes).
 */
export default function HostTokenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)]">
      <TokenLinkBanner
        title="Secure link · Host console"
        subtitle="For this open house only. You do not need a KeyPilot agent account."
      />
      {children}
    </div>
  );
}
