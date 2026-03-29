/**
 * Minimal header for token-scoped public pages — no dashboard, no full app nav.
 */
export function TokenLinkBanner({
  title,
  subtitle = "This page is not the agent dashboard. You do not need a KeyPilot login.",
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-slate-200/80 bg-slate-50/90 px-4 py-3">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</p>
      <p className="mt-1 text-center text-[11px] leading-snug text-slate-500">{subtitle}</p>
    </header>
  );
}
