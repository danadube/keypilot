import {
  pastedBlobHasDetectedFields,
  splitPastedEmailBlob,
} from "@/lib/manual-ingest/split-pasted-email-blob";

describe("splitPastedEmailBlob", () => {
  it("returns no detection for plain body text", () => {
    const r = splitPastedEmailBlob(`The showing by Jane (jane@example.com) at 100 Oak Ave`);
    expect(pastedBlobHasDetectedFields(r)).toBe(false);
    expect(r.subject).toBeNull();
    expect(r.fullText).toContain("100 Oak");
  });

  it("does not treat Note: as a mail header block", () => {
    const r = splitPastedEmailBlob("Note: this is not an email header\n\nHello");
    expect(pastedBlobHasDetectedFields(r)).toBe(false);
  });

  it("extracts Subject from a minimal header block", () => {
    const raw = "Subject: Supra — new showing\r\n\r\nBody line one\nBody two";
    const r = splitPastedEmailBlob(raw);
    expect(r.detected.subject).toBe(true);
    expect(r.subject).toBe("Supra — new showing");
    expect(r.fullText).toContain("Body line one");
    expect(pastedBlobHasDetectedFields(r)).toBe(true);
  });

  it("extracts From (angle bracket), Date, and Subject", () => {
    const raw = `Delivered-To: me@test.com
Return-Path: <bounce@test.com>
Received: from mail.example.com
Subject: Showing confirmed
From: "Supra" <notify@supra.com>
Date: Mon, 23 Mar 2026 18:30:00 +0000
To: agent@test.com

The property at 500 Main St...`;
    const r = splitPastedEmailBlob(raw);
    expect(r.detected.subject).toBe(true);
    expect(r.subject).toBe("Showing confirmed");
    expect(r.detected.sender).toBe(true);
    expect(r.sender).toBe("notify@supra.com");
    expect(r.detected.receivedAt).toBe(true);
    expect(r.receivedAt).not.toBeNull();
    expect(r.receivedAt!.getUTCHours()).toBe(18);
    expect(r.fullText).toContain("500 Main St");
  });

  it("uses Sent: when Date: is absent (Outlook-style)", () => {
    const raw = `From: Host Name <host@example.org>
Sent: Friday, March 20, 2026 2:34 PM
To: you@test.com
Subject: Showing update

Message body.`;
    const r = splitPastedEmailBlob(raw);
    expect(r.detected.subject).toBe(true);
    expect(r.detected.sender).toBe(true);
    expect(r.detected.receivedAt).toBe(true);
    expect(r.sender).toBe("host@example.org");
    expect(r.fullText).toContain("Message body.");
  });

  it("folded Subject continuation is merged", () => {
    const raw = `Subject: This is a long
 subject line that was folded
From: a@b.com
Date: Tue, 1 Jan 2030 12:00:00 GMT

Hi`;
    const r = splitPastedEmailBlob(raw);
    expect(r.detected.subject).toBe(true);
    expect(r.subject).toMatch(/This is a long/);
    expect(r.subject).toMatch(/folded/);
  });

  it("extracts bare email From without angle brackets", () => {
    const raw = `Subject: Test
From: plain@example.com
Date: Wed, 15 Apr 2026 10:00:00 +0000

OK`;
    const r = splitPastedEmailBlob(raw);
    expect(r.sender).toBe("plain@example.com");
  });
});
