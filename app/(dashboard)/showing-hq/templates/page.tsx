"use client";

export default function ShowingHQTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Templates</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Manage follow-up and communication templates.
        </p>
      </div>
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <p className="text-sm font-semibold text-kp-on-surface">Templates</p>
        <p className="mt-1 text-xs text-kp-on-surface-variant">
          Templates for follow-up emails and messages.
        </p>
        <p className="mt-4 text-sm text-kp-on-surface-variant">
          Coming soon: create and manage templates for open house follow-ups.
        </p>
      </div>
    </div>
  );
}
