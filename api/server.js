import cors from "cors";
import express from "express";
import matter from "gray-matter";
import { promises as fs } from "node:fs";
import path from "node:path";

const app = express();

const PORT = Number(process.env.PORT || 3001);
const POSTS_DIR = path.resolve(process.cwd(), process.env.POSTS_DIR || "content/posts");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

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

app.use(express.json());

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
    .replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildExcerpt(content) {
  const cleaned = stripFrontmatterNoise(content);
  return cleaned.slice(0, 220);
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
    sourceFile: fileName
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

app.listen(PORT, () => {
  console.log(`[api] listening on :${PORT}`);
  console.log(`[api] posts dir: ${POSTS_DIR}`);
  console.log(`[api] cors origin: ${CORS_ORIGIN}`);
});
