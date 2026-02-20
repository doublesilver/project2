import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPost } from "../../../lib/api";

const serviceAName = process.env.NEXT_PUBLIC_SERVICE_A_NAME || "Service A";
const serviceAUrl = process.env.NEXT_PUBLIC_SERVICE_A_URL || "https://example.com";

function toParagraphs(content) {
  return content
    .split("\n\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^##\s*/, ""));
}

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }) {
  let post;

  try {
    post = await fetchPost(params.slug);
  } catch {
    notFound();
  }

  const paragraphs = toParagraphs(post.content || "");

  return (
    <main className="detail-shell">
      <Link className="back-link" href="/">
        목록으로
      </Link>

      <article className="detail-card">
        <p className="meta">
          {post.topic} · {new Date(post.date).toLocaleString("ko-KR")}
        </p>
        <h1>{post.title}</h1>

        <div className="detail-content">
          {paragraphs.map((paragraph, index) => (
            <p key={`${post.slug}-${index}`}>{paragraph}</p>
          ))}
        </div>

        <aside className="promo">
          <h3>추천 서비스</h3>
          <p>이 주제를 실전에서 바로 활용하려면 아래 서비스를 확인하세요.</p>
          <a href={serviceAUrl} target="_blank" rel="noreferrer">
            {serviceAName} 이동
          </a>
        </aside>
      </article>
    </main>
  );
}
