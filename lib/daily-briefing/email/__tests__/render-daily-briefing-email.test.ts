import { renderDailyBriefingEmailHtml, renderDailyBriefingEmailPlainText } from "@/lib/daily-briefing/email/render-daily-briefing-email";
import { escapeHtml } from "@/lib/daily-briefing/email/escape-html";
import { SAMPLE_DAILY_BRIEFING } from "@/lib/daily-briefing/sample-daily-briefing";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
  });
});

describe("renderDailyBriefingEmailHtml", () => {
  it("includes branding and major sections for sample payload", () => {
    const html = renderDailyBriefingEmailHtml(SAMPLE_DAILY_BRIEFING, {
      appOrigin: "https://app.example.com",
    });
    expect(html).toContain("KeyPilot");
    expect(html).toContain("Daily briefing");
    expect(html).toContain("Most urgent deal");
    expect(html).toContain("Today’s schedule");
    expect(html).toContain("Pipeline snapshot");
    expect(html).toContain("Smart nudges");
    expect(html).toContain("https://app.example.com/dashboard");
  });

  it("does not echo raw script from injected headline", () => {
    const malicious = {
      ...SAMPLE_DAILY_BRIEFING,
      urgentDeal: {
        ...SAMPLE_DAILY_BRIEFING.urgentDeal!,
        headline: '<script>alert(1)</script>',
      },
    };
    const html = renderDailyBriefingEmailHtml(malicious);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderDailyBriefingEmailPlainText", () => {
  it("produces a text body with schedule and pipeline lines", () => {
    const text = renderDailyBriefingEmailPlainText(SAMPLE_DAILY_BRIEFING, {
      appOrigin: "https://app.example.com",
    });
    expect(text).toContain("KEYPILOT — DAILY BRIEFING");
    expect(text).toContain("PIPELINE SNAPSHOT");
    expect(text).toContain("https://app.example.com/dashboard");
  });
});
