import { loadConfig } from "./config.js";
import { runPipeline } from "./pipeline.js";
import { startScheduler } from "./scheduler.js";

async function runDaily(): Promise<void> {
  const config = loadConfig();
  const result = await runPipeline(config);

  if (result.generatedPosts.length === 0) {
    console.log(`[run-daily] no post generated: ${result.skippedReason ?? "unknown reason"}`);
    return;
  }

  console.log(`[run-daily] generated ${result.generatedPosts.length} post(s)`);
  for (const post of result.generatedPosts) {
    console.log(`- ${post.filePath}`);
  }
}

async function runOnce(): Promise<void> {
  const config = loadConfig();
  const oneShot = { ...config, postsPerDay: Number.MAX_SAFE_INTEGER, postsPerRun: 1 };
  const result = await runPipeline(oneShot);

  if (result.generatedPosts.length === 0) {
    console.log(`[run-once] no post generated: ${result.skippedReason ?? "unknown reason"}`);
    return;
  }

  console.log(`[run-once] generated ${result.generatedPosts.length} post(s)`);
  for (const post of result.generatedPosts) {
    console.log(`- ${post.filePath}`);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "run-daily";

  if (command === "run-once") {
    await runOnce();
    return;
  }

  if (command === "run-daily") {
    await runDaily();
    return;
  }

  if (command === "autopilot") {
    const config = loadConfig();
    startScheduler(config);
    return;
  }

  console.error(`unknown command: ${command}`);
  process.exitCode = 1;
}

void main();
