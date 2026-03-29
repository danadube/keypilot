import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata: Metadata = {
  title: "Showing Feedback | KeyPilot",
  description: "Quick feedback after your showing.",
  robots: "noindex",
};

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <FeedbackForm token={token} />;
}
