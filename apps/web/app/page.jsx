import Link from "next/link";
import { fetchPosts } from "../lib/api";

const serviceAName = process.env.NEXT_PUBLIC_SERVICE_A_NAME || "Service A";
const serviceAUrl = process.env.NEXT_PUBLIC_SERVICE_A_URL || "https://example.com";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let posts = [];
  let hasError = false;

  try {
    posts = await fetchPosts(36);
  } catch {
    hasError = true;
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">B Community Autopilot</p>
        <h1>핫이슈 자동 발행 커뮤니티</h1>
        <p>
          직장인, 취준생, 학생에게 필요한 이슈를 자동 수집하고, 핵심만 빠르게 정리해 제공합니다.
        </p>
        <a className="cta" href={serviceAUrl} target="_blank" rel="noreferrer">
          {serviceAName} 바로가기
        </a>
      </header>

      <section className="grid-wrap">
        {hasError ? <p className="error">게시글을 불러오지 못했습니다. API 연결값을 확인하세요.</p> : null}
        {!hasError && posts.length === 0 ? <p className="empty">아직 발행된 글이 없습니다.</p> : null}

        {posts.map((post) => (
          <article key={post.slug} className="card">
            <p className="meta">
              {post.topic} · {new Date(post.date).toLocaleDateString("ko-KR")}
            </p>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <Link className="readmore" href={`/posts/${post.slug}`}>
              읽기
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
