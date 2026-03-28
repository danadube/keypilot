import { SupraGmailIntegrationsCard } from "@/components/settings/SupraGmailIntegrationsCard";

export default function SettingsIntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-kp-on-surface">Integrations</h2>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Connect tools that feed ShowingHQ. Gmail powers Supra email import.
        </p>
      </div>

      <section aria-labelledby="supra-gmail-heading">
        <h3 id="supra-gmail-heading" className="mb-2 text-sm font-medium text-kp-on-surface">
          Supra (Gmail)
        </h3>
        <SupraGmailIntegrationsCard />
      </section>
    </div>
  );
}
