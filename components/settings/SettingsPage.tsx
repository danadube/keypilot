"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsPageContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account and profile
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-12 w-12",
              },
            }}
          />
          <div>
            <p className="text-sm font-medium">Signed in with Clerk</p>
            <p className="text-sm text-muted-foreground">
              Use the button above to manage your profile, sign out, or switch
              accounts.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KeyPilot</CardTitle>
          <CardDescription>
            Open House Lead Capture — Phase 1 MVP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Features: properties, open houses, QR sign-in, visitors, follow-ups, seller reports, PDF export, email sending.</p>
          <p>More settings coming in future updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
