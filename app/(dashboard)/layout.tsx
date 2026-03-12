import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/40 p-4">
        <nav className="flex flex-col gap-2">
          <Link href="/" className="font-semibold">
            KeyPilot
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link
            href="/properties"
            className="text-muted-foreground hover:text-foreground"
          >
            Properties
          </Link>
          <Link
            href="/open-houses"
            className="text-muted-foreground hover:text-foreground"
          >
            Open Houses
          </Link>
          <Link
            href="/contacts"
            className="text-muted-foreground hover:text-foreground"
          >
            Contacts
          </Link>
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground"
          >
            Settings
          </Link>
        </nav>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <header className="mb-6 flex justify-end">
          <UserButton afterSignOutUrl="/" />
        </header>
        <div className="min-h-[50vh]">
          {children}
        </div>
      </main>
    </div>
  );
}
