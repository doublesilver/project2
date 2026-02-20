import cron from "node-cron";
import { runPipeline } from "./pipeline.js";
import type { PipelineConfig } from "./types.js";

export function startScheduler(config: PipelineConfig): void {
  for (const expression of config.cronExpressions) {
    cron.schedule(
      expression,
      async () => {
        console.log(`[scheduler] trigger expression="${expression}"`);
        try {
          const result = await runPipeline(config);
          if (result.generatedPosts.length === 0) {
            console.log(`[scheduler] no post generated: ${result.skippedReason ?? "unknown reason"}`);
            return;
          }

          console.log(`[scheduler] generated ${result.generatedPosts.length} post(s)`);
          for (const post of result.generatedPosts) {
            console.log(`- ${post.filePath}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          console.error(`[scheduler] run failed: ${message}`);
        }
      },
      { timezone: config.timezone }
    );
  }

  console.log(`[scheduler] started with timezone=${config.timezone}`);
  console.log(`[scheduler] cron expressions: ${config.cronExpressions.join(", ")}`);
}
