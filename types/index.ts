import type {
  User,
  Property,
  Contact,
  OpenHouse,
  OpenHouseVisitor,
  Activity,
  FollowUpDraft,
  SellerReport,
} from "@prisma/client";

export type ApiResponse<T> =
  | { data: T }
  | { error: { message: string; code?: string } };

export type OpenHouseWithProperty = OpenHouse & { property: Property };

export type OpenHouseWithCounts = OpenHouseWithProperty & {
  _count: { visitors: number };
};

export type ContactWithActivity = Contact & { activities: Activity[] };

export type VisitorWithContact = OpenHouseVisitor & { contact: Contact };

export type SellerReportMetrics = {
  totalVisitors: number;
  representedBuyers: number;
  unrepresentedBuyers: number;
  unknownAgentStatus: number;
  followUpDraftsCreated: number;
  visitorComments: string[];
};
