import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PipelineState } from "./types.js";

const DEFAULT_STATE: PipelineState = {
  seenUrls: [],
  recentTopics: [],
  dailyCounts: {},
  posts: []
};

export async function loadState(filePath: string): Promise<PipelineState> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PipelineState;
    return {
      seenUrls: parsed.seenUrls ?? [],
      recentTopics: parsed.recentTopics ?? [],
      dailyCounts: parsed.dailyCounts ?? {},
      posts: parsed.posts ?? []
    };
  } catch {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(filePath: string, state: PipelineState): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export function compactState(state: PipelineState): PipelineState {
  return {
    ...state,
    seenUrls: [...new Set(state.seenUrls)].slice(-2000),
    recentTopics: state.recentTopics.slice(-300),
    posts: state.posts.slice(-1000)
  };
}
