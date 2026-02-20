import { z } from "zod";
import type { FeedSource, PipelineConfig } from "./types.js";

const DEFAULT_FEEDS: FeedSource[] = [
  { name: "Google KR Top", url: "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko" },
  {
    name: "Google KR Jobs",
    url: "https://news.google.com/rss/search?q=%EC%B7%A8%EC%97%85+OR+%EC%B1%84%EC%9A%A9&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    name: "Google KR Work",
    url: "https://news.google.com/rss/search?q=%EC%A7%81%EC%9E%A5%EC%9D%B8+OR+%ED%9A%8C%EC%82%AC&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    name: "Google KR Student",
    url: "https://news.google.com/rss/search?q=%ED%95%99%EC%83%9D+OR+%EB%8C%80%ED%95%99&hl=ko&gl=KR&ceid=KR:ko"
  },
  { name: "Reddit Korea", url: "https://www.reddit.com/r/korea/.rss" }
];

const EnvSchema = z.object({
  SERVICE_A_NAME: z.string().default("Service A"),
  SERVICE_A_URL: z.string().url().default("https://example.com"),
  TIMEZONE: z.string().default("Asia/Seoul"),
  CRON_EXPRESSIONS: z.string().default("0 9 * * *,0 13 * * *,0 19 * * *"),
  POSTS_PER_DAY: z.coerce.number().int().min(1).max(24).default(3),
  POSTS_PER_RUN: z.coerce.number().int().min(1).max(10).default(1),
  SOURCE_LIMIT: z.coerce.number().int().min(20).max(400).default(80),
  TOPIC_COOLDOWN_HOURS: z.coerce.number().int().min(1).max(168).default(36),
  FEED_SOURCES: z.string().optional()
});

function parseFeedSources(raw?: string): FeedSource[] {
  if (!raw) {
    return DEFAULT_FEEDS;
  }

  const items = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      const [name, url] = v.split("|").map((s) => s.trim());
      if (!name || !url) {
        return null;
      }
      return { name, url };
    })
    .filter((v): v is FeedSource => Boolean(v));

  return items.length > 0 ? items : DEFAULT_FEEDS;
}

export function loadConfig(): PipelineConfig {
  const env = EnvSchema.parse(process.env);

  return {
    feedSources: parseFeedSources(env.FEED_SOURCES),
    outputDir: "content/posts",
    stateFile: "data/published-state.json",
    timezone: env.TIMEZONE,
    cronExpressions: env.CRON_EXPRESSIONS.split(",").map((v) => v.trim()).filter(Boolean),
    postsPerDay: env.POSTS_PER_DAY,
    postsPerRun: env.POSTS_PER_RUN,
    sourceLimit: env.SOURCE_LIMIT,
    topicCooldownHours: env.TOPIC_COOLDOWN_HOURS,
    serviceAName: env.SERVICE_A_NAME,
    serviceAUrl: env.SERVICE_A_URL
  };
}
