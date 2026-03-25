/**
 * Operator/debug: one queue row’s stored body vs Supra v1 parser (no DB writes).
 * GET while signed in; use Network tab or curl with session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { diagnoseSupraImportedBody } from "@/lib/integrations/supra/diagnose-supra-imported-body";
import { buildManualParseDraftFromRaw } from "@/lib/integrations/supra/manual-parse-stub";
import {
  PDF_EXACT_END_SHOWING_BODY,
  PDF_EXACT_NEW_SHOWING_BODY,
} from "@/lib/integrations/supra/supra-email-fixtures";
import { parseSupraEmailToDraft } from "@/lib/integrations/supra/parse-supra-email";
import {
  allPersistedFieldsMatchManualDraft,
  comparePersistedToManualDraft,
} from "@/lib/showing-hq/supra-queue-apply-parse-draft";

export const dynamic = "force-dynamic";

function normalizeNewlines(s: string) {
  return s.replace(/\r\n/g, "\n").trim();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const item = await prismaAdmin.supraQueueItem.findFirst({
      where: { id, hostUserId: user.id },
      select: {
        id: true,
        subject: true,
        sender: true,
        externalMessageId: true,
        rawBodyText: true,
        parsedAddress1: true,
        parsedCity: true,
        parsedState: true,
        parsedZip: true,
        parsedScheduledAt: true,
        parsedEventKind: true,
        parsedStatus: true,
        parsedAgentName: true,
        parsedAgentEmail: true,
        parseConfidence: true,
        proposedAction: true,
        queueState: true,
        receivedAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      return apiError("Queue item not found", 404, "NOT_FOUND");
    }

    const body = item.rawBodyText ?? "";
    const norm = normalizeNewlines(body);
    const parsePreview = parseSupraEmailToDraft({
      subject: item.subject,
      rawBodyText: body,
      sender: item.sender,
    });

    const manualDraft = buildManualParseDraftFromRaw({
      subject: item.subject,
      rawBodyText: body,
      sender: item.sender,
    });

    const persistedVsParserExpected = comparePersistedToManualDraft(item, manualDraft);
    const persistedMatchesParserPersistableFields = allPersistedFieldsMatchManualDraft(
      item,
      manualDraft
    );

    const d = diagnoseSupraImportedBody(body);
    const parserFoundCoreFields = Boolean(
      manualDraft.parsedAddress1 ||
        manualDraft.parsedScheduledAt ||
        manualDraft.parsedAgentEmail
    );

    let failingLayerHint: string;
    if (d.looksLikeSnippetOnly || (!d.hasTheShowingBy && body.length < 400)) {
      failingLayerHint =
        "Likely Gmail/body extraction: body looks thin or missing Supra sentence shape.";
    } else if (d.hasTheShowingBy && !parserFoundCoreFields) {
      failingLayerHint =
        "Body looks like Supra but parser produced no address/time/agent — parser gap on this exact text; add a fixture from rawBodyText.";
    } else if (!persistedMatchesParserPersistableFields) {
      failingLayerHint =
        "DB row does not match parser output for the same body — run POST …/parse-draft (Gmail import now auto-parses after ingest). If mismatch persists after POST, investigate write path.";
    } else {
      failingLayerHint =
        "Persisted fields match parser for this body. If UI still looks wrong, hard-refresh and reopen the row (list/detail state).";
    }

    return NextResponse.json({
      data: {
        rawBodyTextLength: body.length,
        rawBodyTextPreview: body.slice(0, 800),
        item,
        storedBodyDiagnostics: d,
        pdfFixtureComparison: {
          exactMatchNewPdfBody: norm === normalizeNewlines(PDF_EXACT_NEW_SHOWING_BODY),
          exactMatchEndPdfBody: norm === normalizeNewlines(PDF_EXACT_END_SHOWING_BODY),
          newPdfFixtureLength: PDF_EXACT_NEW_SHOWING_BODY.length,
          endPdfFixtureLength: PDF_EXACT_END_SHOWING_BODY.length,
        },
        manualDraftPersistable: {
          ...manualDraft,
          parsedScheduledAt: manualDraft.parsedScheduledAt?.toISOString() ?? null,
        },
        persistedVsParserExpected,
        persistedMatchesParserPersistableFields,
        failingLayerHint,
        parsePreview: {
          ...parsePreview,
          parsedScheduledAt: parsePreview.parsedScheduledAt?.toISOString() ?? null,
          parsedShowingBeganAt:
            parsePreview.parsedShowingBeganAt?.toISOString() ?? null,
        },
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
