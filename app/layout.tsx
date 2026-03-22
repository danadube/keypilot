import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { BrandProvider } from "@/design-system/brand-context";

// Inter: body / UI / data text (unchanged default)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Newsreader: editorial / product headings in new KP design system
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
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
        <body className={`${inter.variable} ${newsreader.variable} font-sans antialiased`}>
          <BrandProvider brand="keypilot">
            {children}
          </BrandProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
