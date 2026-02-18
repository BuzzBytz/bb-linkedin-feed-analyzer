/**
 * LinkedIn Feed Capture - Content Script
 * Extracts feed posts from LinkedIn's DOM for analysis
 * Note: LinkedIn's DOM structure changes frequently - selectors may need updates
 */

(function () {
  const FEED_CONTAINER_SELECTORS = [
    '[data-id="urn:li:activity"]',
    '.feed-shared-update-v2',
    'article[data-id]',
    '[data-urn*="activity"]',
  ];

  function extractNumber(text) {
    if (!text) return 0;
    const match = String(text).replace(/,/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function extractPosts() {
    const posts = [];
    const seen = new Set();

    // Try multiple selectors for feed items
    let articles = document.querySelectorAll(
      'div[data-id][data-urn*="activity"], article[data-id], .feed-shared-update-v2'
    );

    if (articles.length === 0) {
      articles = document.querySelectorAll(
        '[data-id="urn:li:activity"], [data-urn*="urn:li:activity"]'
      );
    }

    articles.forEach((article, index) => {
      try {
        const urn = article.getAttribute("data-urn") || article.getAttribute("data-id") || "";
        const id = urn.split(":").pop() || `post-${index}`;
        if (seen.has(id)) return;
        seen.add(id);

        const linkEl = article.querySelector('a[href*="/feed/update/"]');
        const url = linkEl?.href || `https://www.linkedin.com/feed/update/${urn}/`;

        const authorEl =
          article.querySelector(".update-components-actor__name") ||
          article.querySelector('[data-control-name="actor"]') ||
          article.querySelector("span[dir='ltr']");
        const authorName = authorEl?.textContent?.trim() || "Unknown";

        const authorLink = article.querySelector(
          'a[href*="/in/"].update-components-actor__container-link'
        );
        const authorProfileUrl = authorLink?.href;

        const contentEl =
          article.querySelector(".feed-shared-update-v2__description") ||
          article.querySelector(".update-components-text") ||
          article.querySelector('[data-control-name="update"]');
        const content = contentEl?.textContent?.trim() || "";

        const hashtags = [...content.matchAll(/#(\w+)/g)].map((m) => m[1]);

        const reactionsEl = article.querySelector(
          '[data-test-id="social-actions__reaction-count"], .social-details-social-counts__reactions-count'
        );
        const reactions = extractNumber(reactionsEl?.textContent);

        const commentsEl = article.querySelector(
          '[data-test-id="social-actions__comments"], .social-details-social-counts__comments'
        );
        const comments = extractNumber(commentsEl?.textContent);

        // Follower count is rarely visible in feed - use 0 as default
        const authorFollowers = 0;

        posts.push({
          id,
          url,
          authorName,
          authorProfileUrl: authorProfileUrl || undefined,
          authorFollowers,
          content: content.slice(0, 2000),
          reactions,
          comments,
          postedAt: new Date().toISOString(),
          hashtags,
        });
      } catch (e) {
        console.warn("LinkedIn Feed Capture: Could not parse post", e);
      }
    });

    return posts;
  }

  window.__LINKEDIN_FEED_CAPTURE__ = {
    extractPosts,
    getPosts: () => extractPosts(),
  };
})();
