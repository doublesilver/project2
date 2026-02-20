const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function fetchJson(pathname) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchPosts(limit = 24) {
  const data = await fetchJson(`/api/posts?limit=${limit}`);
  return data.items || [];
}

export async function fetchPost(slug) {
  return fetchJson(`/api/posts/${encodeURIComponent(slug)}`);
}

export { API_BASE_URL };
