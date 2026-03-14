/**
 * Current plan config — ShowingHQ entry product.
 * Used by CurrentPlanCard on dashboard and settings.
 * Pricing-ready for future billing integration.
 */

export interface CurrentPlanConfig {
  id: string;
  name: string;
  description: string;
  /** Optional monthly price placeholder (e.g. "$29/month") — no billing yet */
  monthlyPrice?: string;
  features: string[];
}

export const SHOWINGHQ_PLAN: CurrentPlanConfig = {
  id: "showing-hq",
  name: "ShowingHQ",
  description: "Turn open house visitors into clients.",
  monthlyPrice: "$29/month",
  features: [
    "Unlimited open houses",
    "Showing scheduling",
    "QR sign-in",
    "Visitor capture",
    "Follow-up tasks",
    "Google Calendar sync",
    "AI summaries",
    "AI follow-up suggestions",
    "Basic analytics",
  ],
};
