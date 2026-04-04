import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { BrandProvider } from "@/design-system/brand-context";

// Inter: body / UI / data text (unchanged default)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Newsreader: editorial / product headings in new KP design system.
// adjustFontFallback: false — Newsreader is not in Next's capsize metrics DB; without this,
// dev/build logs "Failed to find font override values for font `Newsreader`".
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: false,
});

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

  const appBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const signInUrl = appBase ? `${appBase}/sign-in` : "/sign-in";
  const signUpUrl = appBase ? `${appBase}/sign-up` : "/sign-up";

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
        <body className="font-sans antialiased">
          <BrandProvider brand="keypilot">
            {children}
          </BrandProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
