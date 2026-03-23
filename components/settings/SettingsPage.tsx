"use client";

import { UserButton } from "@clerk/nextjs";

export function SettingsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Account</h1>
        <p className="mt-0.5 text-sm text-kp-on-surface-variant">Manage your account and profile</p>
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-kp-on-surface">Profile</h2>
        <p className="mb-4 text-xs text-kp-on-surface-variant">Manage your profile, sign out, or switch accounts.</p>
        <div className="flex items-center gap-4">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-12 w-12",
              },
            }}
          />
          <p className="text-sm text-kp-on-surface-variant">Signed in with Clerk</p>
        </div>
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-kp-on-surface">KeyPilot</h2>
        <p className="mb-3 text-xs text-kp-on-surface-variant">Open House Lead Capture</p>
        <div className="space-y-1.5 text-xs text-kp-on-surface-variant">
          <p>Properties · Open houses · QR sign-in · Visitors · Follow-ups · Seller reports · PDF export · Email sending</p>
          <p>More settings coming in future updates.</p>
        </div>
      </div>
    </div>
  );
}
