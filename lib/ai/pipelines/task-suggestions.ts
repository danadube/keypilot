/**
 * Task suggestion pipeline: derive AiTaskSuggestion from emails, calendar, open houses.
 * Suggestive only — no automatic task creation.
 */

import { getOpenAIClient } from "../openai-client";
import type { AiTaskSuggestion } from "../types";
import type { NormalizedPriorityEmail } from "@/lib/adapters/email-types";
import type { NormalizedCalendarEvent } from "@/lib/adapters/calendar-types";

const MODEL = "gpt-4o-mini";
const MAX_SUGGESTIONS = 10;

export type OpenHouseContext = {
  id: string;
  title: string;
  startAt: string;
  address: string;
  visitorsCount: number;
};

/**
 * Suggest tasks from emails, calendar events, and open houses.
 * Returns AiTaskSuggestion[] for Home AI To-Do List.
 * Falls back to heuristic suggestions when AI is disabled.
 */
export async function suggestTasks(params: {
  emails: (NormalizedPriorityEmail & { aiSummary?: string; classification?: string })[];
  calendarEvents: NormalizedCalendarEvent[];
  openHouses: OpenHouseContext[];
}): Promise<AiTaskSuggestion[]> {
  const { emails, calendarEvents, openHouses } = params;
  const openai = getOpenAIClient();

  if (!openai) {
    return buildHeuristicSuggestions(params);
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const emailContext = emails.slice(0, 10).map((e) => ({
    id: e.id,
    sender: e.sender,
    subject: e.subject,
    snippet: e.snippet.slice(0, 150),
    classification: e.classification ?? "informational",
  }));

  const calendarContext = calendarEvents
    .filter((e) => new Date(e.startAt) >= today)
    .slice(0, 8)
    .map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      meta: e.meta,
    }));

  const ohContext = openHouses
    .filter((oh) => new Date(oh.startAt) >= today)
    .slice(0, 4)
    .map((oh) => ({
      id: oh.id,
      title: oh.title,
      startAt: oh.startAt,
      address: oh.address,
      visitors: oh.visitorsCount,
    }));

  const prompt = `You are a real estate assistant. Suggest 5-10 actionable to-do items for today based on:
- Emails that need a reply (classification: needs_reply) or mention showings, inspections, closings
- Upcoming calendar events (prepare for meetings, confirm details)
- Open houses (follow up with visitors, prep for next open house)

Today is ${todayStr}.

Emails:
${JSON.stringify(emailContext, null, 2)}

Calendar events:
${JSON.stringify(calendarContext, null, 2)}

Open houses:
${JSON.stringify(ohContext, null, 2)}

Respond with valid JSON only:
{ "tasks": [ { "title": "Reply to buyer agent about showing time", "source": "email", "sourceId": "gmail-xxx", "meta": "From yesterday" }, ... ] }
Source must be one of: email, calendar, open_house, showing, lead, follow_up.`;

  try {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    });

    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("Empty response");

    const parsed = JSON.parse(raw.replace(/```json?\s*/i, "").replace(/```\s*$/i, "")) as {
      tasks?: { title: string; source: string; sourceId?: string; meta?: string }[];
    };
    const tasks = parsed.tasks ?? [];

    return tasks.slice(0, MAX_SUGGESTIONS).map((t, i) => ({
      id: `ai-task-${Date.now()}-${i}`,
      title: t.title,
      source: validateSource(t.source),
      sourceId: t.sourceId,
      meta: t.meta,
      href: inferHref(t),
      suggestedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[ai/task-suggestions] failed", err);
    return buildHeuristicSuggestions(params);
  }
}

function validateSource(s: string): AiTaskSuggestion["source"] {
  const valid: AiTaskSuggestion["source"][] = [
    "email",
    "calendar",
    "showing",
    "open_house",
    "lead",
    "follow_up",
  ];
  return valid.includes(s as AiTaskSuggestion["source"]) ? (s as AiTaskSuggestion["source"]) : "email";
}

function inferHref(t: { source: string; sourceId?: string }): string | undefined {
  if (t.source === "open_house" && t.sourceId) return `/open-houses/${t.sourceId}`;
  return undefined;
}

function buildHeuristicSuggestions(params: {
  emails: (NormalizedPriorityEmail & { classification?: string })[];
  calendarEvents: NormalizedCalendarEvent[];
  openHouses: OpenHouseContext[];
}): AiTaskSuggestion[] {
  const { emails, calendarEvents, openHouses } = params;
  const tasks: AiTaskSuggestion[] = [];
  const now = Date.now();

  const needsReplyEmails = emails.filter((e) => e.classification === "needs_reply");
  needsReplyEmails.slice(0, 3).forEach((e, i) => {
    tasks.push({
      id: `heur-email-${i}`,
      title: `Reply to ${e.sender.split("<")[0].trim() || "sender"} about ${e.subject.slice(0, 40)}`,
      source: "email",
      sourceId: e.id,
      meta: "Needs reply",
      href: e.href,
      suggestedAt: new Date().toISOString(),
    });
  });

  const upcomingEvents = calendarEvents
    .filter((e) => new Date(e.startAt).getTime() >= now)
    .slice(0, 3);
  upcomingEvents.forEach((ev, i) => {
    const start = new Date(ev.startAt);
    const isTomorrow = start.toDateString() !== new Date().toDateString();
    tasks.push({
      id: `heur-cal-${i}`,
      title: `Prep for ${ev.title}`,
      source: "calendar",
      sourceId: ev.id,
      meta: isTomorrow ? "Tomorrow" : "Today",
      suggestedAt: new Date().toISOString(),
    });
  });

  const upcomingOh = openHouses.filter((oh) => new Date(oh.startAt).getTime() >= now).slice(0, 2);
  upcomingOh.forEach((oh, i) => {
    tasks.push({
      id: `heur-oh-${i}`,
      title: `Follow up: ${oh.title}`,
      source: "open_house",
      sourceId: oh.id,
      meta: oh.address,
      href: `/open-houses/${oh.id}`,
      suggestedAt: new Date().toISOString(),
    });
  });

  return tasks.slice(0, MAX_SUGGESTIONS);
}
