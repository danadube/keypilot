import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KeyPilot",
  description: "Real estate operations SaaS platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey?.startsWith("pk_")) {
    console.error("Missing or invalid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  const signInUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") + "/sign-in" ||
    "/sign-in";
  const signUpUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") + "/sign-up" ||
    "/sign-up";

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="en">
        <body className={`${inter.className} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
