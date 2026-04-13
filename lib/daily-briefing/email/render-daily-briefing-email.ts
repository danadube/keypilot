import type { DailyBriefing } from "@/lib/daily-briefing/daily-briefing-types";
import type { ScheduleKind } from "@/lib/dashboard/unified-schedule-merge";
import { resolveAppOrigin, toAbsoluteHref } from "@/lib/daily-briefing/email/app-origin";
import { escapeHtml } from "@/lib/daily-briefing/email/escape-html";

export type DailyBriefingEmailOptions = {
  /** Base URL for links; defaults to `resolveAppOrigin()`. */
  appOrigin?: string;
  /** Optional line under the date; default copy if omitted. */
  introLine?: string;
};

const COLORS = {
  bg: "#0B1120",
  surface: "#151E2E",
  surfaceHigh: "#1C2840",
  border: "#354A66",
  muted: "#9BB4CC",
  text: "#F1F5F9",
  textVariant: "#B8C9DC",
  gold: "#C9A84C",
  goldBg: "#3A2F15",
  teal: "#2DD4BF",
  danger: "#F87171",
} as const;

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatBriefingMoney(value: number | null): string {
  if (value == null) return "—";
  return moneyFmt.format(value);
}

function kindLabel(kind: ScheduleKind): string {
  switch (kind) {
    case "SHOWING":
      return "Showing";
    case "FOLLOW_UP":
      return "Follow-up";
    case "TASK":
      return "Task";
    case "CHECKLIST":
      return "Checklist";
    default:
      return "Item";
  }
}

function formatScheduleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatActivityWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortedSchedule(briefing: DailyBriefing) {
  return [...briefing.todaysSchedule.items].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
}

export function buildDailyBriefingEmailSubject(briefing: DailyBriefing): string {
  return `KeyPilot — Daily briefing · ${briefing.meta.dayLabel}`;
}

function defaultIntro(): string {
  return "Your operational snapshot: urgent deal, today’s schedule, priorities, pipeline, and recent activity.";
}

function ctaButton(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;">
    <tr>
      <td style="border-radius:6px;background:${COLORS.gold};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;color:${COLORS.bg};text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function sectionTitle(title: string): string {
  return `
  <tr>
    <td style="padding:28px 0 8px 0;font-family:Georgia,'Newsreader',serif;font-size:20px;font-weight:600;color:${COLORS.text};letter-spacing:-0.02em;">${escapeHtml(title)}</td>
  </tr>`;
}

function mutedLine(text: string): string {
  return `
  <tr>
    <td style="padding:0 0 4px 0;font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5;color:${COLORS.muted};">${text}</td>
  </tr>`;
}

function bodyLine(text: string): string {
  return `
  <tr>
    <td style="padding:0 0 6px 0;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55;color:${COLORS.textVariant};">${text}</td>
  </tr>`;
}

function badgeHtml(badge: "now" | "next" | "overdue" | undefined): string {
  if (!badge) return "";
  const label = badge === "now" ? "Now" : badge === "next" ? "Next" : "Overdue";
  const bg = badge === "overdue" ? "rgba(248,113,113,0.15)" : COLORS.goldBg;
  const fg = badge === "overdue" ? COLORS.danger : COLORS.gold;
  return ` <span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;font-family:Inter,system-ui,sans-serif;color:${fg};background:${bg};text-transform:uppercase;letter-spacing:0.04em;">${label}</span>`;
}

/**
 * Full HTML email document for the daily briefing. Inline styles only — email-client safe.
 */
export function renderDailyBriefingEmailHtml(
  briefing: DailyBriefing,
  options?: DailyBriefingEmailOptions
): string {
  const origin = options?.appOrigin ?? resolveAppOrigin();
  const intro = options?.introLine ?? defaultIntro();
  const openApp = `${origin}/dashboard`;
  const preheader = `${briefing.meta.dayLabel} · ${intro.slice(0, 120)}`;

  const urgent = briefing.urgentDeal;
  let urgentBlock = "";
  if (urgent) {
    const dealHref = toAbsoluteHref(urgent.href, origin) ?? openApp;
    const lines: string[] = [];
    if (urgent.closingLabel) {
      lines.push(
        `<strong style="color:${COLORS.text};">${escapeHtml(urgent.closingLabel)}</strong>`
      );
    }
    if (urgent.headline) {
      lines.push(`<span style="color:${COLORS.textVariant};">${escapeHtml(urgent.headline)}</span>`);
    }
    if (urgent.subline) {
      lines.push(`<span style="color:${COLORS.muted};font-size:13px;">${escapeHtml(urgent.subline)}</span>`);
    }
    const metaBits: string[] = [];
    if (urgent.checklistOpenCount != null && urgent.checklistOpenCount > 0) {
      metaBits.push(
        `${urgent.checklistOpenCount} checklist item${urgent.checklistOpenCount === 1 ? "" : "s"} open`
      );
    }
    if (urgent.estimatedGci != null) {
      metaBits.push(`Est. GCI ${formatBriefingMoney(urgent.estimatedGci)}`);
    }
    const metaLine =
      metaBits.length > 0
        ? `<div style="margin-top:10px;font-size:13px;color:${COLORS.muted};">${escapeHtml(metaBits.join(" · "))}</div>`
        : "";

    urgentBlock = `
    ${sectionTitle("Most urgent deal")}
    <tr>
      <td style="padding:0;background:${COLORS.surfaceHigh};border-radius:8px;border:1px solid ${COLORS.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:16px 18px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55;color:${COLORS.textVariant};">
              ${lines.join("<br/>")}
              ${metaLine}
              ${ctaButton("Open in KeyPilot", dealHref)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  const scheduleRows = sortedSchedule(briefing);
  let scheduleBody: string;
  if (scheduleRows.length === 0) {
    scheduleBody = bodyLine(
      `<span style="color:${COLORS.muted};">${escapeHtml(briefing.todaysSchedule.emptyMessage || "Nothing on your unified schedule for this day.")}</span>`
    );
  } else {
    scheduleBody = scheduleRows
      .map((item) => {
        const t = formatScheduleTime(item.at);
        const badge = badgeHtml(item.badge);
        const sub = item.subline
          ? `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${escapeHtml(item.subline)}</div>`
          : "";
        const abs = toAbsoluteHref(item.href, origin) ?? openApp;
        return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:72px;vertical-align:top;font-size:13px;font-weight:600;color:${COLORS.teal};font-family:Inter,system-ui,sans-serif;">${escapeHtml(t)}</td>
            <td style="vertical-align:top;font-family:Inter,system-ui,sans-serif;font-size:14px;color:${COLORS.text};">
              <span style="font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(kindLabel(item.kind))}</span>${badge}
              <div style="margin-top:4px;"><a href="${escapeHtml(abs)}" style="color:${COLORS.text};text-decoration:none;font-weight:600;">${escapeHtml(item.title)}</a></div>
              ${sub}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
      })
      .join("");
  }

  const tasks = briefing.priorityTasks.items;
  let tasksBlock: string;
  if (tasks.length === 0) {
    tasksBlock = bodyLine(
      `<span style="color:${COLORS.muted};">No priority tasks in this snapshot.</span>`
    );
  } else {
    tasksBlock = tasks
      .map((task) => {
        const od = task.overdue
          ? `<span style="color:${COLORS.danger};font-weight:700;font-size:12px;margin-right:6px;">OVERDUE</span>`
          : "";
        const abs = toAbsoluteHref(task.href, origin) ?? openApp;
        const sub = task.subline
          ? `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${escapeHtml(task.subline)} · ${escapeHtml(task.sourceTag)}</div>`
          : `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${escapeHtml(task.sourceTag)}</div>`;
        return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-family:Inter,system-ui,sans-serif;font-size:14px;">
        ${od}<a href="${escapeHtml(abs)}" style="color:${COLORS.text};text-decoration:none;font-weight:600;">${escapeHtml(task.title)}</a>
        ${sub}
      </td>
    </tr>`;
      })
      .join("");
    if (briefing.priorityTasks.truncated) {
      tasksBlock += mutedLine(
        `<span style="font-style:italic;">Showing top tasks — full list in Task Pilot.</span>`
      );
    }
  }

  const p = briefing.pipeline;
  const nextClose = p.nextClosing;
  const nextCloseHtml = nextClose
    ? `<div style="margin-top:8px;"><a href="${escapeHtml(toAbsoluteHref(nextClose.href, origin) ?? openApp)}" style="color:${COLORS.teal};text-decoration:none;font-weight:600;">${escapeHtml(nextClose.label)}</a> · ${escapeHtml(nextClose.addressLine)}${
        nextClose.daysUntil != null ? ` · ${nextClose.daysUntil}d` : ""
      }</div>`
    : `<div style="margin-top:8px;color:${COLORS.muted};font-size:13px;">No upcoming closing in snapshot.</div>`;

  const goalPctLine =
    p.ytdPercentToGoal != null
      ? `${p.ytdPercentToGoal.toFixed(1)}% of annual goal`
      : "—";

  const pipelineBlock = `
    ${sectionTitle("Pipeline snapshot")}
    <tr>
      <td style="padding:0;background:${COLORS.surfaceHigh};border-radius:8px;border:1px solid ${COLORS.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:16px 18px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.65;color:${COLORS.textVariant};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:4px 0;width:50%;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Active transactions</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${p.activeTransactionsCount}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Active deals</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${p.activeDealsCount}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Est. pipeline GCI</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${formatBriefingMoney(p.estimatedPipelineGci)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">YTD GCI</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${formatBriefingMoney(p.ytdGci)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Annual GCI goal</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${formatBriefingMoney(p.annualGciGoal)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Progress to goal</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${goalPctLine}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:12px 0 4px 0;border-top:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.05em;">Next closing</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:0 0 8px 0;color:${COLORS.textVariant};font-size:14px;">${nextCloseHtml}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Tasks due (total / overdue)</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${p.tasksDueTotal} / ${p.tasksOverdue}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Active listings</td>
                  <td style="padding:4px 0;text-align:right;color:${COLORS.text};font-weight:600;">${p.activeListingsCount}</td>
                </tr>
              </table>
              ${
                !p.crmAvailable
                  ? `<div style="margin-top:10px;font-size:12px;color:${COLORS.muted};">CRM pipeline metrics may be limited — connect CRM for full detail.</div>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const nudges = briefing.smartNudges;
  let nudgesBlock = "";
  if (nudges.length > 0) {
    const rows = nudges
      .map((n) => {
        const link = n.href ? toAbsoluteHref(n.href, origin) : null;
        const text = link
          ? `<a href="${escapeHtml(link)}" style="color:${COLORS.gold};text-decoration:none;">${escapeHtml(n.text)}</a>`
          : escapeHtml(n.text);
        return `<tr><td style="padding:8px 0;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.5;color:${COLORS.textVariant};border-bottom:1px solid ${COLORS.border};">• ${text}</td></tr>`;
      })
      .join("");
    nudgesBlock = `${sectionTitle("Smart nudges")}<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>`;
  }

  const activity = briefing.recentActivity;
  let activityBlock: string;
  if (activity.length === 0) {
    activityBlock = `${sectionTitle("Recent activity")}${bodyLine(
      `<span style="color:${COLORS.muted};">No recent activity in this snapshot.</span>`
    )}`;
  } else {
    activityBlock = `${sectionTitle("Recent activity")}${activity
      .map((a) => {
        const when = formatActivityWhen(a.occurredAt);
        const link = a.href ? toAbsoluteHref(a.href, origin) : null;
        const title = link
          ? `<a href="${escapeHtml(link)}" style="color:${COLORS.text};text-decoration:none;font-weight:600;">${escapeHtml(a.title)}</a>`
          : `<span style="color:${COLORS.text};font-weight:600;">${escapeHtml(a.title)}</span>`;
        const sub = a.subline
          ? `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${escapeHtml(a.subline)} · ${escapeHtml(a.sourceTag)}</div>`
          : `<div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">${escapeHtml(a.sourceTag)}</div>`;
        return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-family:Inter,system-ui,sans-serif;font-size:13px;">
        <div style="color:${COLORS.muted};font-size:11px;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">${escapeHtml(when)}</div>
        ${title}
        ${sub}
      </td>
    </tr>`;
      })
      .join("")}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${escapeHtml(buildDailyBriefingEmailSubject(briefing))}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 4px 20px 4px;font-family:Georgia,'Newsreader',serif;font-size:26px;font-weight:600;color:${COLORS.gold};letter-spacing:-0.02em;">KeyPilot</td>
          </tr>
          <tr>
            <td style="padding:0 4px 6px 4px;font-family:Inter,system-ui,sans-serif;font-size:15px;font-weight:600;color:${COLORS.text};">Daily briefing</td>
          </tr>
          <tr>
            <td style="padding:0 4px 12px 4px;font-family:Inter,system-ui,sans-serif;font-size:14px;color:${COLORS.teal};">${escapeHtml(briefing.meta.dayLabel)}</td>
          </tr>
          <tr>
            <td style="padding:0 4px 8px 4px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55;color:${COLORS.textVariant};">${escapeHtml(intro)}</td>
          </tr>
          ${
            briefing.meta.scheduleBoundsNote
              ? `<tr><td style="padding:0 4px 16px 4px;font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.45;color:${COLORS.muted};font-style:italic;">${escapeHtml(briefing.meta.scheduleBoundsNote)}</td></tr>`
              : ""
          }
          ${urgentBlock}
          ${sectionTitle("Today’s schedule")}
          ${scheduleBody}
          ${sectionTitle("Priority tasks")}
          ${tasksBlock}
          ${pipelineBlock}
          ${nudgesBlock}
          ${activityBlock}
          <tr>
            <td style="padding:32px 4px 12px 4px;border-top:1px solid ${COLORS.border};font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.6;color:${COLORS.muted};">
              <a href="${escapeHtml(openApp)}" style="color:${COLORS.gold};text-decoration:none;font-weight:600;">Open KeyPilot</a>
              <br/><br/>
              Notification preferences will be available here soon.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function line(text: string): string {
  return text + "\n";
}

/**
 * Plain-text version for multipart email clients.
 */
export function renderDailyBriefingEmailPlainText(
  briefing: DailyBriefing,
  options?: DailyBriefingEmailOptions
): string {
  const origin = options?.appOrigin ?? resolveAppOrigin();
  const intro = options?.introLine ?? defaultIntro();
  const openApp = `${origin}/dashboard`;
  let out = "";
  out += line(`KEYPILOT — DAILY BRIEFING`);
  out += line(briefing.meta.dayLabel);
  out += line("");
  out += line(intro);
  if (briefing.meta.scheduleBoundsNote) {
    out += line(`Note: ${briefing.meta.scheduleBoundsNote}`);
  }
  out += line("");

  if (briefing.urgentDeal) {
    const u = briefing.urgentDeal;
    out += line("MOST URGENT DEAL");
    if (u.closingLabel) out += line(u.closingLabel);
    out += line(u.headline);
    if (u.subline) out += line(u.subline);
    const bits: string[] = [];
    if (u.checklistOpenCount != null && u.checklistOpenCount > 0) {
      bits.push(`${u.checklistOpenCount} checklist items open`);
    }
    if (u.estimatedGci != null) bits.push(`Est. GCI ${formatBriefingMoney(u.estimatedGci)}`);
    if (bits.length) out += line(bits.join(" · "));
    const uh = toAbsoluteHref(u.href, origin);
    if (uh) out += line(`Open: ${uh}`);
    out += line("");
  }

  out += line("TODAY’S SCHEDULE");
  const sched = sortedSchedule(briefing);
  if (sched.length === 0) {
    out += line(briefing.todaysSchedule.emptyMessage || "Nothing on your unified schedule for this day.");
  } else {
    for (const item of sched) {
      const t = formatScheduleTime(item.at);
      const badge = item.badge ? ` [${item.badge}]` : "";
      out += line(`[${t}] ${kindLabel(item.kind)}${badge} — ${item.title}`);
      if (item.subline) out += line(`  ${item.subline}`);
      const abs = toAbsoluteHref(item.href, origin) ?? openApp;
      out += line(`  ${abs}`);
    }
  }
  out += line("");

  out += line("PRIORITY TASKS");
  if (briefing.priorityTasks.items.length === 0) {
    out += line("No priority tasks in this snapshot.");
  } else {
    for (const task of briefing.priorityTasks.items) {
      const od = task.overdue ? "[OVERDUE] " : "";
      out += line(`${od}${task.title}`);
      const sub = task.subline ? `${task.subline} · ${task.sourceTag}` : task.sourceTag;
      out += line(`  ${sub}`);
      out += line(`  ${toAbsoluteHref(task.href, origin) ?? openApp}`);
    }
    if (briefing.priorityTasks.truncated) {
      out += line("(Top tasks only — see Task Pilot for full list.)");
    }
  }
  out += line("");

  const p = briefing.pipeline;
  out += line("PIPELINE SNAPSHOT");
  out += line(`Active transactions: ${p.activeTransactionsCount}`);
  out += line(`Active deals: ${p.activeDealsCount}`);
  out += line(`Est. pipeline GCI: ${formatBriefingMoney(p.estimatedPipelineGci)}`);
  out += line(`YTD GCI: ${formatBriefingMoney(p.ytdGci)}`);
  out += line(`Annual GCI goal: ${formatBriefingMoney(p.annualGciGoal)}`);
  out += line(
    p.ytdPercentToGoal != null
      ? `Progress to goal: ${p.ytdPercentToGoal.toFixed(1)}%`
      : "Progress to goal: —"
  );
  if (p.nextClosing) {
    const nc = p.nextClosing;
    const ncHref = toAbsoluteHref(nc.href, origin) ?? openApp;
    out += line(
      `Next closing: ${nc.label} — ${nc.addressLine}` +
        (nc.daysUntil != null ? ` (${nc.daysUntil}d)` : "")
    );
    out += line(`  ${ncHref}`);
  } else {
    out += line("Next closing: (none in snapshot)");
  }
  out += line(`Tasks due: ${p.tasksDueTotal} (overdue: ${p.tasksOverdue})`);
  out += line(`Active listings: ${p.activeListingsCount}`);
  if (!p.crmAvailable) out += line("CRM pipeline may be limited — connect CRM for full detail.");
  out += line("");

  if (briefing.smartNudges.length > 0) {
    out += line("SMART NUDGES");
    for (const n of briefing.smartNudges) {
      const suffix = n.href ? ` ${toAbsoluteHref(n.href, origin) ?? ""}` : "";
      out += line(`• ${n.text}${suffix}`);
    }
    out += line("");
  }

  out += line("RECENT ACTIVITY");
  if (briefing.recentActivity.length === 0) {
    out += line("No recent activity in this snapshot.");
  } else {
    for (const a of briefing.recentActivity) {
      out += line(`${formatActivityWhen(a.occurredAt)} — ${a.title}`);
      const sub = a.subline ? `${a.subline} · ${a.sourceTag}` : a.sourceTag;
      out += line(`  ${sub}`);
      if (a.href) out += line(`  ${toAbsoluteHref(a.href, origin) ?? ""}`);
    }
  }
  out += line("");
  out += line(`Open KeyPilot: ${openApp}`);
  out += line("");
  out += line("Notification preferences will be available soon.");
  return out.trimEnd() + "\n";
}
