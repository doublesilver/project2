"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function requestJson(pathname, { method = "GET", token = "", body } = {}) {
  const headers = {};
  if (token.trim()) {
    headers["x-admin-token"] = token.trim();
  }
  if (body) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = json?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return json;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [posts, setPosts] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [rawMarkdown, setRawMarkdown] = useState("");
  const [statusText, setStatusText] = useState("관리자 콘솔 준비 완료");
  const [isBusy, setIsBusy] = useState(false);

  const selectedPost = useMemo(
    () => posts.find((post) => post.slug === selectedSlug) || null,
    [posts, selectedSlug]
  );

  async function loadPosts() {
    const data = await requestJson(`/api/posts?limit=100`);
    setPosts(data.items || []);
  }

  async function loadStatus() {
    const data = await requestJson(`/api/admin/status`, { token });
    setStatusText(
      `postCount=${data.postCount}, auth=${data.adminAuth}, tracked=${data.state.trackedPostCount}, recentTopics=${data.state.recentTopicCount}`
    );
  }

  async function handleGenerateOnce() {
    setIsBusy(true);
    setStatusText("자동 발행 실행 중...");

    try {
      const data = await requestJson(`/api/admin/generate-once`, {
        method: "POST",
        token
      });
      await loadPosts();
      setStatusText(`자동 발행 완료: latest=${data.latestPost?.slug || "none"}`);
    } catch (error) {
      setStatusText(`자동 발행 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadRaw(slug) {
    setIsBusy(true);
    try {
      const data = await requestJson(`/api/admin/posts/${encodeURIComponent(slug)}/raw`, { token });
      setSelectedSlug(slug);
      setRawMarkdown(data.raw || "");
      setStatusText(`원문 로드 완료: ${slug}`);
    } catch (error) {
      setStatusText(`원문 로드 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveRaw() {
    if (!selectedSlug) {
      setStatusText("수정할 게시글을 먼저 선택하세요.");
      return;
    }

    setIsBusy(true);
    try {
      await requestJson(`/api/admin/posts/${encodeURIComponent(selectedSlug)}`, {
        method: "PUT",
        token,
        body: { content: rawMarkdown }
      });
      await loadPosts();
      setStatusText(`저장 완료: ${selectedSlug}`);
    } catch (error) {
      setStatusText(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(slug) {
    if (!window.confirm(`정말 삭제할까요?\n${slug}`)) {
      return;
    }

    setIsBusy(true);
    try {
      await requestJson(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        token
      });
      await loadPosts();
      if (slug === selectedSlug) {
        setSelectedSlug("");
        setRawMarkdown("");
      }
      setStatusText(`삭제 완료: ${slug}`);
    } catch (error) {
      setStatusText(`삭제 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void loadPosts().catch(() => {
      setStatusText("게시글 목록을 불러오지 못했습니다.");
    });
  }, []);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Local Admin Console</p>
          <h1>게시글 자동화 운영 콘솔</h1>
          <p>토큰을 입력하고 자동 발행/수정/삭제를 로컬에서 바로 제어할 수 있습니다.</p>
        </div>
        <Link className="ghost-btn" href="/">
          홈으로
        </Link>
      </header>

      <section className="admin-toolbar">
        <label>
          Admin Token
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="ADMIN_TOKEN (없으면 비워두고 로컬에서 사용)"
          />
        </label>

        <div className="admin-actions">
          <button type="button" onClick={() => void loadStatus()} disabled={isBusy}>
            상태 조회
          </button>
          <button type="button" onClick={() => void handleGenerateOnce()} disabled={isBusy}>
            글 1건 자동 발행
          </button>
          <button type="button" onClick={() => void loadPosts()} disabled={isBusy}>
            목록 새로고침
          </button>
        </div>

        <p className="admin-status">{statusText}</p>
      </section>

      <section className="admin-grid">
        <aside className="admin-list">
          <h2>게시글 목록 ({posts.length})</h2>
          <ul>
            {posts.map((post) => (
              <li key={post.slug} className={post.slug === selectedSlug ? "selected" : ""}>
                <button type="button" className="post-select" onClick={() => void handleLoadRaw(post.slug)}>
                  <span>{post.title}</span>
                  <small>{new Date(post.date).toLocaleString("ko-KR")}</small>
                </button>
                <button type="button" className="danger" onClick={() => void handleDelete(post.slug)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="admin-editor">
          <h2>원문 편집 {selectedPost ? `- ${selectedPost.slug}` : ""}</h2>
          <textarea
            value={rawMarkdown}
            onChange={(event) => setRawMarkdown(event.target.value)}
            placeholder="왼쪽 목록에서 게시글을 선택하면 본문 원문을 편집할 수 있습니다."
          />
          <div className="editor-actions">
            <button type="button" onClick={() => void handleSaveRaw()} disabled={isBusy || !selectedSlug}>
              저장
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
