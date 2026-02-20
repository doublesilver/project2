import crypto from "node:crypto";
import type { FeedItem, GeneratedPost, PipelineConfig, TrendCandidate } from "./types.js";

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function markdownEscape(value: string): string {
  return value.replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/\|/g, "\\|");
}

function toSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-가-힣]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "hot-issue"
  );
}

function buildTakeaways(evidence: FeedItem[]): string[] {
  const takeaways = evidence.slice(0, 3).map((item) => {
    const summary = sanitizeText(item.summary ?? "");
    if (summary.length > 40) {
      return summary.slice(0, 160);
    }
    return sanitizeText(item.title);
  });

  while (takeaways.length < 3) {
    takeaways.push("Monitor this topic for concrete policy or market updates.");
  }

  return takeaways.slice(0, 3);
}

export function createGeneratedPost(candidate: TrendCandidate, config: PipelineConfig): GeneratedPost {
  const now = new Date().toISOString();
  const slugBase = toSlug(candidate.topic);
  const nonce = crypto.randomBytes(2).toString("hex");
  const slug = `${slugBase}-${nonce}`;
  const title = `Hot Issue Briefing: ${candidate.topic}`;

  const takeaways = buildTakeaways(candidate.evidence);
  const sourceLines = candidate.evidence
    .slice(0, 5)
    .map((item) => `- [${markdownEscape(item.title)}](${item.link}) (${item.source})`)
    .join("\n");

  const body = [
    `---`,
    `title: "${title.replace(/"/g, "\\\"")}"`,
    `slug: "${slug}"`,
    `date: "${now}"`,
    `topic: "${candidate.topic.replace(/"/g, "\\\"")}"`,
    `category: "hot-issue"`,
    `tags: ["auto", "trend"]`,
    `ai_generated: true`,
    `---`,
    ``,
    `## Why this topic is trending`,
    `This issue appeared repeatedly across multiple sources in the latest monitoring window.`,
    ``,
    `## Key updates`,
    sourceLines,
    ``,
    `## Practical takeaways`,
    `1. ${takeaways[0]}`,
    `2. ${takeaways[1]}`,
    `3. ${takeaways[2]}`,
    ``,
    `## Service spotlight`,
    `If you want a practical tool linked to this topic, try [${config.serviceAName}](${config.serviceAUrl}).`,
    ``
  ].join("\n");

  return {
    id: crypto.randomUUID(),
    title,
    slug,
    topic: candidate.topic,
    body,
    sources: candidate.evidence,
    publishedAt: now,
    filePath: ""
  };
}
