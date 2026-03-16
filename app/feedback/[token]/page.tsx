import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata: Metadata = {
  title: "Showing Feedback | KeyPilot",
  description: "Quick feedback after your showing.",
  robots: "noindex",
};

export default function FeedbackPage({
  params,
}: {
  params: { token: string };
}) {
  return <FeedbackForm token={params.token} />;
}
