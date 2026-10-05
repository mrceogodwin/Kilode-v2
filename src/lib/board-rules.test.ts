import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyProblems,
  creativeFits,
  cvFileProblem,
  deadlinePast,
  experienceMatch,
  laneMatch,
  mentionQuery,
  payLine,
  parseSalary,
  runEnd,
  salaryBand,
  searchRank,
  shareText,
  slotCharge,
} from "./board-rules.ts";

describe("job and ad rules", () => {
  it("reads 150k as one hundred and fifty thousand, not 150", () => {
    assert.equal(parseSalary("150k"), 150000);
    assert.equal(parseSalary("150K"), 150000);
  });

  it("reads millions and a naira amount with commas", () => {
    assert.equal(parseSalary("1.2m"), 1200000);
    assert.equal(parseSalary("₦200,000"), 200000);
  });

  it("uses the low end of a range so 150k-300k is not 150300", () => {
    assert.equal(parseSalary("150k - 300k"), 150000);
    assert.equal(parseSalary("150k-300k"), 150000);
  });

  it("treats pay on request as no number", () => {
    assert.equal(parseSalary("Salary on request"), 0);
    assert.equal(parseSalary(""), 0);
    assert.equal(parseSalary("ask"), 0);
  });

  it("puts 150k under 500k and 1.2m in the top band", () => {
    assert.equal(salaryBand("150k", "Under ₦500k"), true);
    assert.equal(salaryBand("1.2m", "₦1M+"), true);
    assert.equal(salaryBand("700k", "₦500k – ₦1M"), true);
    assert.equal(salaryBand("1.2m", "Under ₦500k"), false);
  });

  it("keeps or drops roles with no pay when the seeker says so", () => {
    assert.equal(salaryBand("Salary on request", "Under ₦500k", true), true);
    assert.equal(salaryBand("Salary on request", "Under ₦500k", false), false);
  });

  it("does not call Part-time a creative role", () => {
    assert.equal(laneMatch("part-time nurse", "Creative"), false);
    assert.equal(laneMatch("graphic artist needed", "Creative"), true);
    assert.equal(laneMatch("virtual assistant inbox", "Tech"), false);
  });

  it("filters experience only when a level is picked", () => {
    assert.equal(experienceMatch("Junior", "All"), true);
    assert.equal(experienceMatch("Junior", "Mid"), false);
    assert.equal(experienceMatch("Senior", "Senior"), true);
    assert.equal(experienceMatch("", "Junior"), false);
  });

  it("ranks a title match above a mention buried in the description", () => {
    const title = searchRank({ title: "Virtual Assistant", company: "Desk", body: "Inbox" }, "virtual");
    const body = searchRank({ title: "Nurse", company: "Care", body: "virtual ward round" }, "virtual");
    assert.ok(title > body);
    assert.equal(searchRank({ title: "Nurse", company: "Care", body: "ward" }, "astronaut"), 0);
  });

  it("rejects an application with no note, a short phone, or a bad CV link", () => {
    assert.match(applyProblems({ note: "", phone: "08012345678", legal: true }), /note/i);
    assert.match(applyProblems({ note: "I can start Monday", phone: "123", legal: true }), /phone/i);
    assert.match(applyProblems({ note: "I can start Monday", phone: "08012345678", cv: "drive.google.com/x", legal: true }), /https/i);
    assert.equal(applyProblems({ note: "I can start Monday", phone: "0801 234 5678", cv: "https://files.example/cv.pdf", skills: "Excel", legal: true }), "");
    assert.match(applyProblems({ note: "I can start Monday", phone: "08012345678", legal: false }), /notice/i);
  });

  it("rejects a note over 500 and skills over 160", () => {
    assert.match(applyProblems({ note: "a".repeat(501), phone: "08012345678" }), /500/);
    assert.match(applyProblems({ note: "Ready", phone: "08012345678", skills: "x".repeat(161) }), /160/);
  });

  it("rejects a CV that is not a PDF or is over 4MB", () => {
    assert.equal(cvFileProblem({ name: "cv.pdf", type: "application/pdf", size: 1000 }), "");
    assert.match(cvFileProblem({ name: "cv.docx", type: "application/msword", size: 1000 }), /PDF/);
    assert.match(cvFileProblem({ name: "cv.pdf", type: "application/pdf", size: 5 * 1024 * 1024 }), /4MB/);
  });

  it("accepts a creative within 25 percent and rejects a square on a wide slot", () => {
    assert.equal(creativeFits(1080, 720, "1080 × 720"), true);
    assert.equal(creativeFits(1200, 800, "1080 × 720"), true);
    assert.equal(creativeFits(400, 400, "1080 × 720"), false);
  });

  it("does not charge more when the advertiser picks more days", () => {
    assert.equal(slotCharge(40, 1), 40);
    assert.equal(slotCharge(40, 30), 40);
    assert.equal(slotCharge(150, 14), 150);
  });

  it("ends a 7 day run seven days after payment", () => {
    const start = Date.parse("2026-10-05T00:00:00Z");
    assert.equal(runEnd(start, 7) - start, 7 * 86_400_000);
    assert.equal(runEnd(start, 3) - start, 7 * 86_400_000);
  });

  it("builds a share line from the role, not from a random link alone", () => {
    assert.equal(shareText({ title: "Virtual Assistant", company: "North Desk", city: "Lagos" }, "https://kilode-v2.vercel.app"), "Virtual Assistant · North Desk · Lagos\nhttps://kilode-v2.vercel.app");
  });

  it("flags an apply-by date that is already past and ignores a blank one", () => {
    const now = Date.parse("2026-10-05T12:00:00Z");
    assert.equal(deadlinePast("2020-01-01", now), true);
    assert.equal(deadlinePast("2026-12-01", now), false);
    assert.equal(deadlinePast("", now), false);
    assert.equal(deadlinePast("soon", now), false);
  });

  it("shows 150k as naira and keeps both ends of a range", () => {
    assert.match(payLine("150k"), /^₦150/);
    assert.match(payLine("150k - 300k"), /300k/);
    assert.equal(payLine("Salary on request"), "Salary on request");
    assert.equal(payLine(""), "Salary on request");
  });

  it("runs a known day count for that many days and an unknown count for seven", () => {
    const start = Date.parse("2026-10-05T00:00:00Z");
    assert.equal(runEnd(start, 30) - start, 30 * 86_400_000);
    assert.equal(runEnd(start, 1) - start, 86_400_000);
    assert.equal(runEnd(start, 9) - start, 7 * 86_400_000);
  });

  it("reads a mention only when at least two letters are typed", () => {
    assert.equal(mentionQuery("hello @ad"), "ad");
    assert.equal(mentionQuery("hello @a"), "");
    assert.equal(mentionQuery("hello @ada is here"), "");
    assert.equal(mentionQuery("email me"), "");
  });
});
