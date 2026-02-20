import cors from "cors";
import express from "express";
import matter from "gray-matter";
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const app = express();

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.PORT || 3001);
const POSTS_DIR = path.resolve(ROOT_DIR, process.env.POSTS_DIR || "content/posts");
const STATE_FILE = path.resolve(ROOT_DIR, process.env.STATE_FILE || "data/published-state.json");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || "").trim();
const APP_TIMEZONE = process.env.TIMEZONE || "Asia/Seoul";

function parseAllowedOrigins(raw) {
  if (!raw || raw.trim() === "*") {
    return null;
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(CORS_ORIGIN);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    }
  })
);

app.use(express.json({ limit: "2mb" }));

function toDateValue(value) {
  const time = new Date(value || "").getTime();
  if (Number.isNaN(time)) {
    return 0;
  }
  return time;
}

function stripFrontmatterNoise(content) {
  return content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildExcerpt(content) {
  const cleaned = stripFrontmatterNoise(content);
  return cleaned.slice(0, 220);
}

function formatDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function slugifyText(value) {
  return (
    String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-가-힣]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "manual-post"
  );
}

function toStateShape(raw) {
  return {
    seenUrls: Array.isArray(raw?.seenUrls) ? raw.seenUrls : [],
    recentTopics: Array.isArray(raw?.recentTopics) ? raw.recentTopics : [],
    dailyCounts: raw?.dailyCounts && typeof raw.dailyCounts === "object" ? raw.dailyCounts : {},
    posts: Array.isArray(raw?.posts) ? raw.posts : []
  };
}

async function loadState() {
  try {
    const raw = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    return toStateShape(raw);
  } catch {
    return toStateShape({});
  }
}

async function saveState(state) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(toStateShape(state), null, 2), "utf8");
}

async function readPostFromFile(filePath) {
  const fileName = path.basename(filePath);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  const slug = String(parsed.data.slug || fileName.replace(/\.md$/i, "")).trim();
  const title = String(parsed.data.title || slug || "Untitled").trim();
  const date = String(parsed.data.date || new Date().toISOString());
  const topic = String(parsed.data.topic || "general");
  const category = String(parsed.data.category || "hot-issue");
  const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags.map((tag) => String(tag)) : [];

  return {
    slug,
    title,
    date,
    topic,
    category,
    tags,
    aiGenerated: Boolean(parsed.data.ai_generated),
    excerpt: buildExcerpt(parsed.content),
    content: parsed.content.trim(),
    sourceFile: fileName,
    rawFrontmatter: parsed.data
  };
}

async function listPostFiles() {
  try {
    const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md") && entry.name !== ".gitkeep")
      .map((entry) => path.join(POSTS_DIR, entry.name));
  } catch {
    return [];
  }
}

async function loadAllPosts() {
  const files = await listPostFiles();
  const posts = await Promise.all(files.map((file) => readPostFromFile(file)));

  return posts.sort((a, b) => toDateValue(b.date) - toDateValue(a.date));
}

function getNextSequenceForDate(files, dateKey) {
  const prefix = `${dateKey}-`;
  let maxSeq = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    if (!fileName.startsWith(prefix)) {
      continue;
    }
    const parts = fileName.split("-");
    if (parts.length < 4) {
      continue;
    }
    const seq = Number(parts[3]);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return maxSeq + 1;
}

async function createManualPost({ title, topic, category, tags, content }) {
  const posts = await loadAllPosts();
  const existingSlugs = new Set(posts.map((post) => post.slug));
  const baseSlug = slugifyText(title || topic || "manual-post");
  let slug = baseSlug;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${randomBytes(2).toString("hex")}`;
  }

  const date = new Date();
  const dateIso = date.toISOString();
  const dateKey = formatDateKey(date);
  const files = await listPostFiles();
  const sequence = getNextSequenceForDate(files, dateKey);
  const fileName = `${dateKey}-${String(sequence).padStart(2, "0")}-${slug}.md`;
  const filePath = path.join(POSTS_DIR, fileName);

  const body = matter.stringify(`${String(content || "").trim()}\n`, {
    title: String(title || slug).trim(),
    slug,
    date: dateIso,
    topic: String(topic || "general").trim(),
    category: String(category || "manual").trim(),
    tags: Array.isArray(tags)
      ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
      : [],
    ai_generated: false
  });

  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.writeFile(filePath, body, "utf8");

  const state = await loadState();
  state.posts.push({
    id: randomUUID(),
    title: String(title || slug).trim(),
    slug,
    topic: String(topic || "general").trim(),
    filePath: path.join("content/posts", fileName),
    publishedAt: dateIso,
    sourceUrls: []
  });
  await saveState(state);

  return {
    slug,
    fileName,
    title: String(title || slug).trim(),
    date: dateIso,
    topic: String(topic || "general").trim()
  };
}

async function findPostBySlug(slug) {
  const files = await listPostFiles();

  for (const filePath of files) {
    const post = await readPostFromFile(filePath);
    if (post.slug === slug) {
      return { filePath, post };
    }
  }

  return null;
}

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  if (forwarded) {
    return forwarded;
  }

  return String(req.ip || req.socket?.remoteAddress || "");
}

function isLocalAddress(ip) {
  const normalized = String(ip || "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized === "::ffff:127.0.0.1" ||
    normalized.startsWith("127.") ||
    normalized.includes("localhost")
  );
}

function getAdminTokenFromRequest(req) {
  const authorization = String(req.get("authorization") || "");
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  const headerToken = String(req.get("x-admin-token") || "").trim();
  if (headerToken) {
    return headerToken;
  }

  if (typeof req.query.adminToken === "string") {
    return req.query.adminToken.trim();
  }

  return "";
}

function verifyAdmin(req, res, next) {
  const token = getAdminTokenFromRequest(req);

  if (ADMIN_TOKEN) {
    if (!token || token !== ADMIN_TOKEN) {
      res.status(401).json({ message: "Unauthorized admin token." });
      return;
    }
    next();
    return;
  }

  const ip = getRequestIp(req);
  if (!isLocalAddress(ip)) {
    res.status(403).json({
      message: "Admin endpoints are local-only when ADMIN_TOKEN is not configured.",
      ip
    });
    return;
  }

  next();
}

async function runGenerateOnce() {
  const { stdout, stderr } = await execFileAsync("npm", ["run", "run-once"], {
    cwd: ROOT_DIR,
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024
  });

  return {
    stdout: stdout || "",
    stderr: stderr || ""
  };
}

app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    service: "project2-api",
    time: new Date().toISOString()
  });
});

app.get("/api/posts", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const page = Math.max(Number(req.query.page || 1), 1);

  const posts = await loadAllPosts();
  const offset = (page - 1) * limit;
  const items = posts.slice(offset, offset + limit).map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    topic: post.topic,
    category: post.category,
    tags: post.tags,
    aiGenerated: post.aiGenerated,
    excerpt: post.excerpt
  }));

  res.json({
    items,
    page,
    limit,
    total: posts.length,
    hasNext: offset + items.length < posts.length
  });
});

app.get("/api/posts/:slug", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  const posts = await loadAllPosts();
  const post = posts.find((item) => item.slug === slug);

  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  res.json(post);
});

app.get("/api/meta", async (_req, res) => {
  const posts = await loadAllPosts();

  res.json({
    postCount: posts.length,
    latestPostDate: posts[0]?.date || null,
    topics: [...new Set(posts.map((post) => post.topic))]
  });
});

app.get("/api/admin/status", verifyAdmin, async (_req, res) => {
  const posts = await loadAllPosts();
  const state = await loadState();

  res.json({
    ok: true,
    adminAuth: ADMIN_TOKEN ? "token" : "local-ip",
    postCount: posts.length,
    latestPost: posts[0]
      ? {
          slug: posts[0].slug,
          title: posts[0].title,
          date: posts[0].date
        }
      : null,
    state: {
      seenUrlCount: state.seenUrls.length,
      recentTopicCount: state.recentTopics.length,
      trackedPostCount: state.posts.length,
      dailyCounts: state.dailyCounts
    }
  });
});

app.post("/api/admin/generate-once", verifyAdmin, async (_req, res) => {
  try {
    const result = await runGenerateOnce();
    const posts = await loadAllPosts();

    res.json({
      ok: true,
      latestPost: posts[0]
        ? {
            slug: posts[0].slug,
            title: posts[0].title,
            date: posts[0].date
          }
        : null,
      stdout: result.stdout.trim().split("\n").slice(-20),
      stderr: result.stderr.trim().split("\n").slice(-20)
    });
  } catch (error) {
    const stdout = String(error?.stdout || "");
    const stderr = String(error?.stderr || "");

    res.status(500).json({
      ok: false,
      message: "Failed to run autopost command.",
      stdout: stdout.trim().split("\n").slice(-30),
      stderr: stderr.trim().split("\n").slice(-30)
    });
  }
});

app.post("/api/admin/posts/manual", verifyAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const topic = String(req.body?.topic || "").trim();
  const category = String(req.body?.category || "manual").trim();
  const rawTags = String(req.body?.tags || "");
  const content = typeof req.body?.content === "string" ? req.body.content : "";

  if (!title || title.length < 4) {
    res.status(400).json({ message: "title must be at least 4 characters" });
    return;
  }
  if (!topic || topic.length < 2) {
    res.status(400).json({ message: "topic must be at least 2 characters" });
    return;
  }
  if (!content.trim() || content.trim().length < 20) {
    res.status(400).json({ message: "content must be at least 20 characters" });
    return;
  }
  if (content.length > 200_000) {
    res.status(400).json({ message: "content too large" });
    return;
  }

  const tags = rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

  try {
    const created = await createManualPost({
      title,
      topic,
      category,
      tags,
      content
    });

    res.json({
      ok: true,
      created
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      message: `Failed to create manual post: ${message}`
    });
  }
});

app.get("/api/admin/posts/:slug/raw", verifyAdmin, async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) {
    res.status(400).json({ message: "slug is required" });
    return;
  }

  const found = await findPostBySlug(slug);
  if (!found) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  const raw = await fs.readFile(found.filePath, "utf8");

  res.json({
    slug,
    fileName: path.basename(found.filePath),
    raw
  });
});

app.put("/api/admin/posts/:slug", verifyAdmin, async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  const content = typeof req.body?.content === "string" ? req.body.content : "";

  if (!slug) {
    res.status(400).json({ message: "slug is required" });
    return;
  }
  if (!content.trim()) {
    res.status(400).json({ message: "content is required" });
    return;
  }
  if (content.length > 200_000) {
    res.status(400).json({ message: "content too large" });
    return;
  }

  const found = await findPostBySlug(slug);
  if (!found) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  const originalRaw = await fs.readFile(found.filePath, "utf8");
  const parsed = matter(originalRaw);
  const nextRaw = matter.stringify(`${content.trim()}\n`, parsed.data);

  await fs.writeFile(found.filePath, nextRaw, "utf8");

  res.json({
    ok: true,
    slug,
    fileName: path.basename(found.filePath)
  });
});

app.delete("/api/admin/posts/:slug", verifyAdmin, async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) {
    res.status(400).json({ message: "slug is required" });
    return;
  }

  const found = await findPostBySlug(slug);
  if (!found) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  await fs.unlink(found.filePath);

  const state = await loadState();
  state.posts = state.posts.filter((post) => post.slug !== slug);
  await saveState(state);

  res.json({
    ok: true,
    slug,
    fileName: path.basename(found.filePath)
  });
});

app.listen(PORT, () => {
  console.log(`[api] listening on :${PORT}`);
  console.log(`[api] posts dir: ${POSTS_DIR}`);
  console.log(`[api] state file: ${STATE_FILE}`);
  console.log(`[api] cors origin: ${CORS_ORIGIN}`);
  console.log(`[api] admin auth: ${ADMIN_TOKEN ? "token" : "local-ip only"}`);
});
