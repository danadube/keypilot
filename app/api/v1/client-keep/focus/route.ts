/**
 * ClientKeep Focus View — prioritized work surface (GET).
 * Uses existing CRM data only; no schema changes.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { getDashboardVisibleContactIds } from "@/lib/contacts/contact-access";
import {
  clientKeepFocusResponseSchema,
  type ClientKeepFocusResponse,
} from "@/lib/validations/client-keep-focus";

export const dynamic = "force-dynamic";

const STALE_DAYS = 21;
const NEW_DAYS = 21;
const PRIORITY: Record<string, number> = {
  reminder: 0,
  follow_up_task: 1,
  draft: 2,
  stale_contact: 3,
};

const DEAL_ACTIVE = ["INTERESTED", "SHOWING", "OFFER", "NEGOTIATION", "UNDER_CONTRACT"] as const;

const DEAL_STATUS_LABEL: Record<string, string> = {
  INTERESTED: "Interested",
  SHOWING: "Showing",
  OFFER: "Offer",
  NEGOTIATION: "Negotiation",
  UNDER_CONTRACT: "Under contract",
  CLOSED: "Closed",
  LOST: "Lost",
};

const TX_ACTIVE = ["LEAD", "UNDER_CONTRACT", "IN_ESCROW", "PENDING"] as const;

const TX_STATUS_LABEL: Record<string, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

function contactName(c: { firstName: string; lastName: string }): string {
  return `${c.firstName} ${c.lastName}`.trim() || "Contact";
}

function propertyOneLine(p: {
  address1: string;
  city: string;
  state: string;
}): string {
  const line = [p.address1, p.city, p.state].filter(Boolean).join(" · ");
  return line || "Property";
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const now = new Date();
    const staleBefore = new Date(now);
    staleBefore.setDate(staleBefore.getDate() - STALE_DAYS);
    const newSince = new Date(now);
    newSince.setDate(newSince.getDate() - NEW_DAYS);

    const contactIds = await getDashboardVisibleContactIds(user.id);
    if (contactIds.length === 0) {
      const empty: ClientKeepFocusResponse = {
        needsAttention: [],
        pipeline: { deals: [], transactions: [] },
        newOrUnworked: [],
      };
      return NextResponse.json({ data: empty });
    }

    const idSet = new Set(contactIds);

    const [
      overdueReminders,
      overdueFollowUps,
      staleContacts,
      openDrafts,
      deals,
      transactions,
      newUnworked,
    ] = await withRLSContext(user.id, async (tx) =>
      Promise.all([
        tx.followUpReminder.findMany({
          where: {
            userId: user.id,
            status: "PENDING",
            dueAt: { lt: now },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, status: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 12,
        }),
        tx.followUp.findMany({
          where: {
            createdByUserId: user.id,
            deletedAt: null,
            dueAt: { lt: now },
            status: { in: ["NEW", "PENDING", "CONTACTED", "NURTURE"] },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, status: true },
            },
          },
          orderBy: { dueAt: "asc" },
          take: 12,
        }),
        tx.contact.findMany({
          where: {
            id: { in: contactIds },
            deletedAt: null,
            status: { not: "LOST" },
            updatedAt: { lt: staleBefore },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "asc" },
          take: 8,
        }),
        tx.followUpDraft.findMany({
          where: {
            openHouse: { hostUserId: user.id, deletedAt: null },
            deletedAt: null,
            status: { in: ["DRAFT", "REVIEWED"] },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        tx.deal.findMany({
          where: {
            userId: user.id,
            status: { in: [...DEAL_ACTIVE] },
            contactId: { in: contactIds },
          },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true },
            },
            property: {
              select: { id: true, address1: true, city: true, state: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
        tx.transaction.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            status: { in: [...TX_ACTIVE] },
            primaryContactId: { not: null },
          },
          include: {
            primaryContact: {
              select: { id: true, firstName: true, lastName: true },
            },
            property: {
              select: { id: true, address1: true, city: true, state: true },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        tx.contact.findMany({
          where: {
            id: { in: contactIds },
            deletedAt: null,
            createdAt: { gte: newSince },
            userActivities: { none: { userId: user.id } },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            source: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ])
    );

    type Attention = ClientKeepFocusResponse["needsAttention"][number];
    const raw: Attention[] = [];

    for (const r of overdueReminders) {
      if (!idSet.has(r.contactId)) continue;
      const firstLine =
        r.body.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "Reminder";
      raw.push({
        kind: "reminder",
        id: r.id,
        headline: "Overdue reminder",
        subline: firstLine.length > 90 ? `${firstLine.slice(0, 89)}…` : firstLine,
        dueAt: r.dueAt.toISOString(),
        href: `/contacts/${encodeURIComponent(r.contactId)}`,
        contactId: r.contactId,
        contactName: contactName(r.contact),
      });
    }

    for (const f of overdueFollowUps) {
      if (!idSet.has(f.contactId)) continue;
      raw.push({
        kind: "follow_up_task",
        id: f.id,
        headline: "Overdue follow-up",
        subline: f.title,
        dueAt: f.dueAt.toISOString(),
        href: `/contacts/${encodeURIComponent(f.contactId)}`,
        contactId: f.contactId,
        contactName: contactName(f.contact),
      });
    }

    for (const d of openDrafts) {
      if (!idSet.has(d.contactId)) continue;
      raw.push({
        kind: "draft",
        id: d.id,
        headline: "Follow-up draft",
        subline: d.subject,
        href: `/showing-hq/follow-ups/draft/${encodeURIComponent(d.id)}`,
        contactId: d.contactId,
        contactName: contactName(d.contact),
      });
    }

    const priorityIds = new Set(
      raw.filter((x) => x.kind !== "stale_contact").map((x) => x.contactId)
    );

    for (const c of staleContacts) {
      if (priorityIds.has(c.id)) continue;
      raw.push({
        kind: "stale_contact",
        id: c.id,
        headline: "No recent touch",
        subline: "Schedule a check-in or note",
        href: `/contacts/${encodeURIComponent(c.id)}`,
        contactId: c.id,
        contactName: contactName(c),
      });
    }

    raw.sort((a, b) => {
      const pa = PRIORITY[a.kind] ?? 99;
      const pb = PRIORITY[b.kind] ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return da - db;
    });

    const seenContact = new Set<string>();
    const needsAttention: Attention[] = [];
    for (const row of raw) {
      if (seenContact.has(row.contactId)) continue;
      seenContact.add(row.contactId);
      needsAttention.push(row);
      if (needsAttention.length >= 14) break;
    }

    const pipelineDeals = deals
      .filter((d) => idSet.has(d.contactId))
      .map((d) => ({
        id: d.id,
        status: d.status,
        statusLabel: DEAL_STATUS_LABEL[d.status] ?? d.status,
        contactId: d.contact.id,
        contactName: contactName(d.contact),
        propertyLabel: propertyOneLine(d.property),
        href: `/deals/${encodeURIComponent(d.id)}`,
      }));

    const pipelineTx = transactions
      .filter((t) => t.primaryContactId && idSet.has(t.primaryContactId))
      .map((t) => {
        const pc = t.primaryContact!;
        return {
          id: t.id,
          status: t.status,
          statusLabel: TX_STATUS_LABEL[t.status] ?? t.status,
          contactId: pc.id,
          contactName: contactName(pc),
          propertyLabel: propertyOneLine(t.property),
          href: `/transactions/${encodeURIComponent(t.id)}`,
        };
      });

    const newOrUnworked = newUnworked.map((c) => ({
      id: c.id,
      contactName: contactName(c),
      status: c.status,
      source: c.source,
      createdAt: c.createdAt.toISOString(),
      href: `/contacts/${encodeURIComponent(c.id)}`,
    }));

    const payload: ClientKeepFocusResponse = {
      needsAttention,
      pipeline: {
        deals: pipelineDeals,
        transactions: pipelineTx,
      },
      newOrUnworked,
    };

    const parsed = clientKeepFocusResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("client-keep focus response shape", parsed.error.flatten());
      return apiError("Focus data could not be assembled", 500);
    }

    return NextResponse.json({ data: parsed.data });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}
