import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="detail-shell">
      <article className="detail-card">
        <h1>404</h1>
        <p>요청한 게시글을 찾을 수 없습니다.</p>
        <Link className="back-link" href="/">
          홈으로 돌아가기
        </Link>
      </article>
    </main>
  );
}
