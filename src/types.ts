export interface FeedSource {
  name: string;
  url: string;
}

export interface FeedItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export interface TrendCandidate {
  topic: string;
  score: number;
  evidence: FeedItem[];
}

export interface GeneratedPost {
  id: string;
  title: string;
  slug: string;
  topic: string;
  body: string;
  sources: FeedItem[];
  publishedAt: string;
  filePath: string;
}

export interface RecentTopic {
  topic: string;
  publishedAt: string;
}

export interface PostRecord {
  id: string;
  title: string;
  slug: string;
  topic: string;
  filePath: string;
  publishedAt: string;
  sourceUrls: string[];
}

export interface PipelineState {
  seenUrls: string[];
  recentTopics: RecentTopic[];
  dailyCounts: Record<string, number>;
  posts: PostRecord[];
}

export interface PipelineConfig {
  feedSources: FeedSource[];
  outputDir: string;
  stateFile: string;
  timezone: string;
  cronExpressions: string[];
  postsPerDay: number;
  postsPerRun: number;
  sourceLimit: number;
  topicCooldownHours: number;
  serviceAName: string;
  serviceAUrl: string;
}
