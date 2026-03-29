/**
 * Seller report aggregation types and helpers.
 * Aggregates traffic (visitors, flyer), engagement (follow-ups), and feedback for a property.
 * Used by seller-report API and prepared for future email/weekly automation.
 */

import type { FeedbackEmailReplyEntry, FeedbackSummary } from "@/lib/feedback-summary";

export type SellerReportTraffic = {
  visitorCount: number;
  flyerSentCount: number;
  flyerOpenedCount: number;
};

export type SellerReportEngagement = {
  followUpsSentCount: number;
};

export type SellerReportData = {
  traffic: SellerReportTraffic;
  engagement: SellerReportEngagement;
  feedback: FeedbackSummary;
  feedbackEmailReplies?: FeedbackEmailReplyEntry[];
};
