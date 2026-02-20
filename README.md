# project2 Autopost Engine

Automates trend collection and article generation for repository B (`project2`).

## What It Does

- Collects fresh items from RSS feeds relevant to workers, job seekers, and students.
- Extracts trend candidates from repeated topic signals.
- Generates and publishes markdown posts into `content/posts`.
- Enforces limits: up to 3 posts/day, with topic cooldown.
- Persists state in `data/published-state.json` to prevent duplicates.

## Commands

```bash
npm install
npm run run-once   # force-generate 1 post (ignores daily cap)
npm run run-daily  # generate based on daily limits
npm run autopilot  # start in-process scheduler
npm run typecheck
```

## Schedule (3/day)

GitHub Actions workflow `.github/workflows/autopost.yml` runs at:

- 00:00 UTC
- 04:00 UTC
- 10:00 UTC

This corresponds to 09:00, 13:00, 19:00 in `Asia/Seoul`.

## Environment Variables

Copy `.env.example` and set values as needed.

- `SERVICE_A_NAME`, `SERVICE_A_URL`: CTA target promoted in each generated post.
- `POSTS_PER_DAY`: default `3`.
- `POSTS_PER_RUN`: default `1`.
- `SOURCE_LIMIT`: feed items fetched each run.
- `TOPIC_COOLDOWN_HOURS`: topic reuse cooldown window.
- `TIMEZONE`, `CRON_EXPRESSIONS`: scheduler settings.
- `FEED_SOURCES`: optional custom feed list (`name|url,name|url`).

## Notes

- This implementation focuses on reliable automation and duplicate control.
- Generated posts are markdown drafts optimized for publish pipelines.
- You can replace template generation in `src/postWriter.ts` with an LLM API step later.
