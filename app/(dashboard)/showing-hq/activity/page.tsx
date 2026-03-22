"use client";

export default function ShowingHQActivityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Activity</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Track showing activity, sign-ins, and follow-ups.
        </p>
      </div>
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <p className="text-sm font-semibold text-kp-on-surface">Activity feed</p>
        <p className="mt-1 text-xs text-kp-on-surface-variant">
          Activity for your showings will appear here.
        </p>
        <p className="mt-4 text-sm text-kp-on-surface-variant">
          Coming soon: a unified activity feed across open houses and follow-ups.
        </p>
      </div>
    </div>
  );
}
