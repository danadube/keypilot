/**
 * Shared Supra Gmail → queue import (manual POST, scheduled cron, or “Run now” in UI).
 * Updates `SupraGmailImportSettings` with last-run metadata.
 *
 * Idempotence: each message uses stable `externalMessageId` (`gmail-{id}`); `ingestSupraQueueItemIfNew`
 * hits `@@unique([hostUserId, externalMessageId])` so repeats create no duplicate queue rows (refresh or skip only).
 *
 * Overlap: `importRunStartedAt` is a soft lock (cleared in `finally`; stale after ~12 minutes).
 */

import { prismaAdmin } from "@/lib/db";
import { fetchSupraGmailMessages } from "@/lib/adapters/gmail";
import { applySupraV1ParseDraftToQueueItem } from "@/lib/showing-hq/supra-queue-apply-parse-draft";
import { ingestSupraQueueItemIfNew } from "@/lib/showing-hq/supra-queue-ingest";

/** If a run exceeds this duration without releasing the lock, another run may proceed (crash recovery). */
export const IMPORT_RUN_LOCK_STALE_MS = 12 * 60 * 1000;

export type SupraGmailImportSource = "manual" | "scheduled";

function normalizeImportErrorMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 1000);
}

export type SupraGmailImportRunResult =
  | {
      ok: true;
      skipped: false;
      imported: number;
      refreshed: number;
      skippedMessages: number;
      autoParsed: number;
      scanned: number;
    }
  | {
      ok: false;
      skipped: true;
      reason: "automation_disabled" | "no_gmail_connection" | "import_already_in_progress";
      message?: string;
    }
  | {
      ok: false;
      skipped: false;
      error: string;
    };

async function tryAcquireSupraGmailImportLock(userId: string): Promise<boolean> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - IMPORT_RUN_LOCK_STALE_MS);
  return prismaAdmin.$transaction(async (tx) => {
    const row = await tx.supraGmailImportSettings.findUnique({
      where: { userId },
      select: { importRunStartedAt: true },
    });
    if (
      row?.importRunStartedAt != null &&
      row.importRunStartedAt.getTime() >= staleBefore.getTime()
    ) {
      return false;
    }
    await tx.supraGmailImportSettings.upsert({
      where: { userId },
      create: {
        userId,
        importRunStartedAt: now,
      },
      update: { importRunStartedAt: now },
    });
    return true;
  });
}

async function releaseSupraGmailImportLock(userId: string): Promise<void> {
  await prismaAdmin.supraGmailImportSettings.updateMany({
    where: { userId },
    data: { importRunStartedAt: null },
  });
}

async function persistRunOutcome(
  userId: string,
  source: SupraGmailImportSource,
  data:
    | {
        success: true;
        imported: number;
        refreshed: number;
        skippedMessages: number;
        autoParsed: number;
        scanned: number;
      }
    | { success: false; error: string }
): Promise<void> {
  const now = new Date();
  if (data.success) {
    await prismaAdmin.supraGmailImportSettings.upsert({
      where: { userId },
      create: {
        userId,
        lastRunAt: now,
        lastRunSuccess: true,
        lastRunSource: source,
        lastRunImported: data.imported,
        lastRunRefreshed: data.refreshed,
        lastRunSkipped: data.skippedMessages,
        lastRunScanned: data.scanned,
        lastRunAutoParsed: data.autoParsed,
        lastRunError: null,
      },
      update: {
        lastRunAt: now,
        lastRunSuccess: true,
        lastRunSource: source,
        lastRunImported: data.imported,
        lastRunRefreshed: data.refreshed,
        lastRunSkipped: data.skippedMessages,
        lastRunScanned: data.scanned,
        lastRunAutoParsed: data.autoParsed,
        lastRunError: null,
      },
    });
  } else {
    await prismaAdmin.supraGmailImportSettings.upsert({
      where: { userId },
      create: {
        userId,
        lastRunAt: now,
        lastRunSuccess: false,
        lastRunSource: source,
        lastRunImported: 0,
        lastRunRefreshed: 0,
        lastRunSkipped: 0,
        lastRunScanned: 0,
        lastRunAutoParsed: 0,
        lastRunError: normalizeImportErrorMessage(data.error),
      },
      update: {
        lastRunAt: now,
        lastRunSuccess: false,
        lastRunSource: source,
        lastRunImported: null,
        lastRunRefreshed: null,
        lastRunSkipped: null,
        lastRunScanned: null,
        lastRunAutoParsed: null,
        lastRunError: normalizeImportErrorMessage(data.error),
      },
    });
  }
}

/**
 * @param respectAutomationDisabled — when true (scheduled), skip users who turned automation off.
 */
export async function runSupraGmailImportForUser(
  hostUserId: string,
  options: {
    source: SupraGmailImportSource;
    respectAutomationDisabled?: boolean;
  }
): Promise<SupraGmailImportRunResult> {
  const { source, respectAutomationDisabled = false } = options;

  if (respectAutomationDisabled) {
    const settings = await prismaAdmin.supraGmailImportSettings.findUnique({
      where: { userId: hostUserId },
      select: { automationEnabled: true },
    });
    if (settings && !settings.automationEnabled) {
      return { ok: false, skipped: true, reason: "automation_disabled" };
    }
  }

  const connections = await prismaAdmin.connection.findMany({
    where: {
      userId: hostUserId,
      provider: "GOOGLE",
      service: "GMAIL",
      status: "CONNECTED",
      isEnabled: true,
      accessToken: { not: null },
    },
  });

  if (connections.length === 0) {
    return {
      ok: false,
      skipped: true,
      reason: "no_gmail_connection",
      message: "No active Gmail connection.",
    };
  }

  const acquired = await tryAcquireSupraGmailImportLock(hostUserId);
  if (!acquired) {
    return {
      ok: false,
      skipped: true,
      reason: "import_already_in_progress",
      message: "An import is already running for this account.",
    };
  }

  let imported = 0;
  let refreshed = 0;
  let skippedMessages = 0;
  let autoParsed = 0;
  const seenGmailIds = new Set<string>();

  try {
    for (const conn of connections) {
      if (!conn.accessToken) continue;
      const gmailConn = {
        id: conn.id,
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        tokenExpiresAt: conn.tokenExpiresAt,
        accountEmail: conn.accountEmail,
      };

      let messages;
      try {
        messages = await fetchSupraGmailMessages(gmailConn);
      } catch (e) {
        console.error("[supra-gmail-import] fetch failed for connection", conn.id, e);
        continue;
      }

      for (const m of messages) {
        if (seenGmailIds.has(m.gmailMessageId)) continue;
        seenGmailIds.add(m.gmailMessageId);

        // Stable id → unique (hostUserId, externalMessageId); duplicates become refresh/skip, not new showings.
        const externalMessageId = `gmail-${m.gmailMessageId}`;
        const { status, queueItemId } = await ingestSupraQueueItemIfNew(hostUserId, {
          externalMessageId,
          subject: m.subject,
          rawBodyText: m.rawBodyText,
          sender: m.sender,
          receivedAt: m.receivedAt,
        });
        if (status === "imported") imported += 1;
        else if (status === "refreshed") refreshed += 1;
        else skippedMessages += 1;

        if (queueItemId && (status === "imported" || status === "refreshed")) {
          try {
            const pr = await applySupraV1ParseDraftToQueueItem({
              hostUserId,
              queueItemId,
            });
            if (pr.ok) autoParsed += 1;
          } catch (e) {
            console.error("[supra-gmail-import] auto-parse failed", queueItemId, e);
          }
        }
      }
    }

    await persistRunOutcome(hostUserId, source, {
      success: true,
      imported,
      refreshed,
      skippedMessages,
      autoParsed,
      scanned: seenGmailIds.size,
    });

    return {
      ok: true,
      skipped: false,
      imported,
      refreshed,
      skippedMessages,
      autoParsed,
      scanned: seenGmailIds.size,
    };
  } catch (e) {
    const msg = normalizeImportErrorMessage(
      e instanceof Error ? e.message : String(e)
    );
    console.error("[supra-gmail-import] run failed", hostUserId, e);
    await persistRunOutcome(hostUserId, source, { success: false, error: msg });
    return { ok: false, skipped: false, error: msg };
  } finally {
    await releaseSupraGmailImportLock(hostUserId).catch((e) => {
      console.error("[supra-gmail-import] lock release failed", hostUserId, e);
    });
  }
}

/** User IDs eligible for scheduled import (Gmail connected, automation on or unset). */
export async function listUserIdsForScheduledSupraGmailImport(): Promise<string[]> {
  const withGmail = await prismaAdmin.connection.findMany({
    where: {
      provider: "GOOGLE",
      service: "GMAIL",
      status: "CONNECTED",
      isEnabled: true,
      accessToken: { not: null },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const userIds = Array.from(new Set(withGmail.map((c) => c.userId)));
  if (userIds.length === 0) return [];

  const disabled = await prismaAdmin.supraGmailImportSettings.findMany({
    where: { userId: { in: userIds }, automationEnabled: false },
    select: { userId: true },
  });
  const disabledSet = new Set(disabled.map((d) => d.userId));
  return userIds.filter((id) => !disabledSet.has(id));
}
