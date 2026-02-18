/**
 * Extract post URN from a LinkedIn "Copy link to post" URL.
 * Example: https://www.linkedin.com/feed/update/urn:li:activity:7123456789/ → urn:li:activity:7123456789
 */
export function getUrnFromPostUrl(postUrl: string): string | null {
  if (!postUrl || typeof postUrl !== "string") return null;
  const trimmed = postUrl.trim();
  // Match /feed/update/urn:li:activity:123/ or /feed/update/urn:li:share:123/ etc.
  const match = trimmed.match(/linkedin\.com\/feed\/update\/(urn:li:[a-zA-Z0-9:_-]+)/i);
  if (match) return match[1];
  // Also allow pasted path-only: /feed/update/urn:li:activity:123
  const pathMatch = trimmed.match(/\/feed\/update\/(urn:li:[a-zA-Z0-9:_-]+)/i);
  if (pathMatch) return pathMatch[1];
  return null;
}

/**
 * Build full post URL from URN (for display or API).
 */
export function getPostUrlFromUrn(urn: string): string {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`;
}
