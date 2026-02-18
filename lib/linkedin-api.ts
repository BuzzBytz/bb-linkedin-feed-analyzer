/**
 * Fetch a single post by URN from LinkedIn REST Posts API.
 * Requires LINKEDIN_ACCESS_TOKEN (OAuth; r_member_social often needed for reading posts).
 * Feed gives urn:li:activity:XXX; Posts API docs mention urn:li:share: and urn:li:ugcPost: — we try activity as-is first.
 */

import type { FeedPost } from "./types";

const LINKEDIN_VERSION = "202401"; // YYYYMM
const POSTS_BASE = "https://api.linkedin.com/rest/posts";

function encodeUrn(urn: string): string {
  return encodeURIComponent(urn);
}

export async function fetchPostByUrn(
  accessToken: string,
  urn: string,
  url: string
): Promise<FeedPost | null> {
  const encoded = encodeUrn(urn);
  const res = await fetch(`${POSTS_BASE}/${encoded}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) {
    if (res.status === 403) {
      console.warn(`LinkedIn API 403 for ${urn} — r_member_social may be required.`);
    }
    return null;
  }

  const data = (await res.json().catch(() => null)) as {
    id?: string;
    author?: string;
    commentary?: string;
    createdAt?: number;
    lifecycleState?: string;
  } | null;

  if (!data) return null;

  const id = (data.id ?? urn).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 100);
  const content = typeof data.commentary === "string" ? data.commentary : "";
  const hashtags = (content.match(/#\w+/g) ?? []).map((h) => h.slice(1));

  return {
    id,
    url,
    authorName: "LinkedIn Author", // API may not return display name without extra call
    content: content.slice(0, 2000),
    hashtags,
    postedAt:
      typeof data.createdAt === "number"
        ? new Date(data.createdAt).toISOString()
        : undefined,
  };
}
