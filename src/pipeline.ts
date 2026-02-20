import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadState, saveState, compactState } from "./stateStore.js";
import { collectFeedItems, findTrendCandidates } from "./trendCollector.js";
import { createGeneratedPost } from "./postWriter.js";
import type { GeneratedPost, PipelineConfig, TrendCandidate } from "./types.js";

interface PipelineResult {
  generatedPosts: GeneratedPost[];
  skippedReason?: string;
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim();
}

function getDateKey(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function canUseTopic(topic: string, nowMs: number, cooldownHours: number, recentTopics: { topic: string; publishedAt: string }[]): boolean {
  const normalized = normalizeTopic(topic);
  const cooldownMs = cooldownHours * 3_600_000;

  for (const recent of recentTopics) {
    if (normalizeTopic(recent.topic) !== normalized) {
      continue;
    }
    const recentTime = new Date(recent.publishedAt).getTime();
    if (!Number.isNaN(recentTime) && nowMs - recentTime < cooldownMs) {
      return false;
    }
  }
  return true;
}

function pickCandidates(candidates: TrendCandidate[], maxCount: number, nowMs: number, config: PipelineConfig, recentTopics: { topic: string; publishedAt: string }[]): TrendCandidate[] {
  const selected: TrendCandidate[] = [];

  for (const candidate of candidates) {
    if (selected.length >= maxCount) {
      break;
    }

    if (!canUseTopic(candidate.topic, nowMs, config.topicCooldownHours, recentTopics)) {
      continue;
    }

    selected.push(candidate);
  }

  return selected;
}

export async function runPipeline(config: PipelineConfig): Promise<PipelineResult> {
  const state = await loadState(config.stateFile);
  const items = await collectFeedItems(config.feedSources, config.sourceLimit);

  if (items.length === 0) {
    return { generatedPosts: [], skippedReason: "No feed items collected." };
  }

  const unseenItems = items.filter((item) => !state.seenUrls.includes(item.link));
  if (unseenItems.length === 0) {
    return { generatedPosts: [], skippedReason: "No unseen items available." };
  }

  const candidates = findTrendCandidates(unseenItems);
  if (candidates.length === 0) {
    return { generatedPosts: [], skippedReason: "No trend candidate reached minimum threshold." };
  }

  const dateKey = getDateKey(config.timezone);
  const todayCount = state.dailyCounts[dateKey] ?? 0;
  const remainingToday = Math.max(0, config.postsPerDay - todayCount);
  if (remainingToday <= 0) {
    return { generatedPosts: [], skippedReason: `Daily cap reached (${config.postsPerDay}).` };
  }

  const maxToGenerate = Math.min(config.postsPerRun, remainingToday);
  const nowMs = Date.now();
  const picked = pickCandidates(candidates, maxToGenerate, nowMs, config, state.recentTopics);

  if (picked.length === 0) {
    return { generatedPosts: [], skippedReason: "Candidates blocked by topic cooldown rules." };
  }

  const generatedPosts: GeneratedPost[] = [];
  await mkdir(config.outputDir, { recursive: true });

  for (let i = 0; i < picked.length; i += 1) {
    const candidate = picked[i];
    const post = createGeneratedPost(candidate, config);
    const fileName = `${dateKey}-${String(todayCount + i + 1).padStart(2, "0")}-${post.slug}.md`;
    const filePath = join(config.outputDir, fileName);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, post.body, "utf8");

    post.filePath = filePath;
    generatedPosts.push(post);

    state.seenUrls.push(...post.sources.map((source) => source.link));
    state.recentTopics.push({ topic: post.topic, publishedAt: post.publishedAt });
    state.posts.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      topic: post.topic,
      filePath: post.filePath,
      publishedAt: post.publishedAt,
      sourceUrls: post.sources.map((source) => source.link)
    });
  }

  state.dailyCounts[dateKey] = todayCount + generatedPosts.length;
  await saveState(config.stateFile, compactState(state));

  return { generatedPosts };
}
