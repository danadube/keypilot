import type { Metadata } from "next";
import { VisitorSignInForm } from "@/components/oh/VisitorSignInForm";

export const metadata: Metadata = {
  title: "Open House Sign-In | KeyPilot",
  description: "Sign in to visit the open house.",
  robots: "noindex",
};

export default function PublicSignInPage({
  params,
}: {
  params: { slug: string };
}) {
  return <VisitorSignInForm slug={params.slug} />;
}
