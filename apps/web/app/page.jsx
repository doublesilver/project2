import Link from "next/link";
import { fetchPosts } from "../lib/api";

const serviceAName = process.env.NEXT_PUBLIC_SERVICE_A_NAME || "Service A";
const serviceAUrl = process.env.NEXT_PUBLIC_SERVICE_A_URL || "https://example.com";

const PAGE_SIZE = 18;

function toSingle(searchValue) {
  if (Array.isArray(searchValue)) {
    return searchValue[0] || "";
  }
  return String(searchValue || "");
}

function buildSearchHref({ page, q, topic }) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (q.trim()) {
    params.set("q", q.trim());
  }
  if (topic.trim()) {
    params.set("topic", topic.trim());
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const q = toSingle(searchParams?.q);
  const topic = toSingle(searchParams?.topic);
  const pageRaw = Number(toSingle(searchParams?.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  let data = null;
  let hasError = false;

  try {
    data = await fetchPosts({
      limit: PAGE_SIZE,
      page,
      q,
      topic
    });
  } catch {
    hasError = true;
  }

  const posts = data?.items || [];
  const topics = data?.topics || [];
  const hasPrev = page > 1;
  const hasNext = Boolean(data?.hasNext);

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">B Community Autopilot</p>
        <h1>핫이슈 자동 발행 커뮤니티</h1>
        <p>
          직장인, 취준생, 학생에게 필요한 이슈를 자동 수집하고, 핵심만 빠르게 정리해 제공합니다.
        </p>
        <div className="hero-actions">
          <a className="cta" href={serviceAUrl} target="_blank" rel="noreferrer">
            {serviceAName} 바로가기
          </a>
          <Link className="ghost-btn" href="/admin">
            관리 콘솔
          </Link>
        </div>
      </header>

      <section className="discover-panel">
        <form className="search-form" method="get" action="/">
          <input type="search" name="q" placeholder="제목/본문/태그 검색" defaultValue={q} />
          <input type="hidden" name="topic" value={topic} />
          <button type="submit">검색</button>
        </form>

        <div className="topic-chips">
          <Link className={topic ? "chip" : "chip active"} href={buildSearchHref({ page: 1, q, topic: "" })}>
            전체
          </Link>
          {topics.map((topicName) => (
            <Link
              key={topicName}
              className={topicName === topic ? "chip active" : "chip"}
              href={buildSearchHref({ page: 1, q, topic: topicName })}
            >
              {topicName}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid-wrap">
        {hasError ? <p className="error">게시글을 불러오지 못했습니다. API 연결값을 확인하세요.</p> : null}
        {!hasError && posts.length === 0 ? (
          <p className="empty">조건에 맞는 게시글이 없습니다. 검색어/토픽을 바꿔보세요.</p>
        ) : null}

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

      {!hasError && (hasPrev || hasNext) ? (
        <nav className="pager" aria-label="pagination">
          {hasPrev ? (
            <Link className="pager-btn" href={buildSearchHref({ page: page - 1, q, topic })}>
              이전
            </Link>
          ) : (
            <span className="pager-btn disabled">이전</span>
          )}

          <span className="pager-index">{page} 페이지</span>

          {hasNext ? (
            <Link className="pager-btn" href={buildSearchHref({ page: page + 1, q, topic })}>
              다음
            </Link>
          ) : (
            <span className="pager-btn disabled">다음</span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
