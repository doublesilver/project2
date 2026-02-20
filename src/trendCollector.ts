import Parser from "rss-parser";
import type { FeedItem, FeedSource, TrendCandidate } from "./types.js";

const parser = new Parser({
  timeout: 12_000,
  customFields: {
    item: [["media:content", "media"], ["dc:creator", "author"]]
  }
});

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "into",
  "about",
  "today",
  "after",
  "before",
  "what",
  "when",
  "where",
  "will",
  "would",
  "could",
  "should",
  "있다",
  "하다",
  "되다",
  "대한",
  "에서",
  "으로",
  "관련",
  "정도",
  "통해",
  "그리고",
  "또한",
  "대한민국"
]);

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => {
      u.searchParams.delete(key);
    });
    return u.toString();
  } catch {
    return url;
  }
}

function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z0-9가-힣]{2,}/g) ?? [];
  return tokens.filter((token) => !STOPWORDS.has(token) && token.length <= 24);
}

function computeFreshnessScore(isoDate: string): number {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) {
    return 1;
  }
  const ageHours = Math.max(0, (Date.now() - time) / 3_600_000);
  if (ageHours <= 6) return 1.8;
  if (ageHours <= 24) return 1.4;
  if (ageHours <= 48) return 1.15;
  return 1;
}

export async function collectFeedItems(sources: FeedSource[], sourceLimit: number): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const rawItem of feed.items.slice(0, 40)) {
        const title = (rawItem.title ?? "").trim();
        const link = canonicalizeUrl((rawItem.link ?? "").trim());
        if (!title || !link) {
          continue;
        }

        items.push({
          title,
          link,
          source: source.name,
          summary: (rawItem.contentSnippet ?? rawItem.content ?? "").slice(0, 500),
          publishedAt: rawItem.isoDate ?? rawItem.pubDate ?? new Date().toISOString()
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[collect] failed source=${source.name}: ${message}`);
    }
  }

  const deduped = new Map<string, FeedItem>();
  for (const item of items) {
    if (!deduped.has(item.link)) {
      deduped.set(item.link, item);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, sourceLimit);
}

export function findTrendCandidates(items: FeedItem[]): TrendCandidate[] {
  const scoreByTopic = new Map<string, number>();
  const evidenceByTopic = new Map<string, FeedItem[]>();

  for (const item of items) {
    const freshness = computeFreshnessScore(item.publishedAt);
    const uniqTokens = [...new Set(tokenize(item.title))];

    for (const token of uniqTokens) {
      const nextScore = (scoreByTopic.get(token) ?? 0) + freshness;
      scoreByTopic.set(token, nextScore);

      const list = evidenceByTopic.get(token) ?? [];
      if (!list.some((existing) => existing.link === item.link)) {
        list.push(item);
      }
      evidenceByTopic.set(token, list);
    }
  }

  return Array.from(scoreByTopic.entries())
    .map(([topic, score]) => ({
      topic,
      score,
      evidence: (evidenceByTopic.get(topic) ?? []).slice(0, 6)
    }))
    .filter((candidate) => candidate.evidence.length >= 2)
    .sort((a, b) => b.score - a.score);
}
