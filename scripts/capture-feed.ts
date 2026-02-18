/**
 * Local LinkedIn feed capture script (Playwright).
 * Run: npm run capture:feed
 *
 * Prerequisites:
 * - npx playwright install chromium
 * - Log in to LinkedIn in the browser that Playwright opens.
 *
 * Usage: USER_DATA_DIR=./linkedin-profile MAX_POSTS=100 npm run capture:feed
 * Headless: set CAPTURE_HEADLESS=true in .env (or HEADLESS=1 when running CLI).
 *
 * Output: writes feed.json in project root (or path from OUT_FILE).
 *
 * Expected LinkedIn feed structure may change; selectors might need updates.
 * Use at your own risk. Do not use for bulk automated scraping.
 */

import "dotenv/config";
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const MAX_POSTS = parseInt(process.env.MAX_POSTS ?? "500", 10);
const OUT_FILE = process.env.OUT_FILE ?? path.join(process.cwd(), "feed.json");
const USER_DATA_DIR = process.env.USER_DATA_DIR; // optional: reuse logged-in profile
const HEADLESS =
  process.env.CAPTURE_HEADLESS === "true" ||
  process.env.HEADLESS === "1" ||
  process.env.HEADLESS === "true";
// Stop after this many consecutive iterations with no new posts (e.g. when you manually scroll and then stop)
const NO_NEW_POSTS_EXIT = Math.max(1, parseInt(process.env.CAPTURE_NO_NEW_POSTS_EXIT ?? "3", 10));

interface FeedPost {
  id: string;
  url: string;
  authorName: string;
  authorProfileUrl?: string;
  authorFollowers?: number;
  content: string;
  reactions?: number;
  comments?: number;
  hashtags?: string[];
  postedAt?: string;
  commentSnippets?: string[];
}

function extractNumber(text: string | null): number | undefined {
  if (!text) return undefined;
  const n = text.replace(/\D/g, "");
  return n ? parseInt(n, 10) : undefined;
}

function isContextDestroyed(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Execution context was destroyed") ||
    msg.includes("Target closed") ||
    msg.includes("frame was detached")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const context = await chromium.launchPersistentContext(
    USER_DATA_DIR ?? path.join(process.cwd(), "playwright-linkedin-data"),
    {
      headless: HEADLESS,
      channel: "chromium",
      viewport: { width: 1280, height: 800 },
    }
  );

  const page = await context.newPage();
  await page.goto("https://www.linkedin.com/feed/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Wait for feed to stabilize (LinkedIn often navigates or re-renders after load)
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForSelector('div[data-id^="urn:li:activity"]', { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const posts: FeedPost[] = [];
  const seen = new Set<string>();
  let noNewPostsCount = 0;

  for (let i = 0; i < MAX_POSTS; i++) {
    const countAtStart = posts.length;
    let cards: Awaited<ReturnType<typeof page.$$>> = [];
    try {
      cards = await page.$$('div[data-id^="urn:li:activity"]');
    } catch (err) {
      if (isContextDestroyed(err)) {
        await sleep(3000);
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await sleep(2000);
        continue;
      }
      throw err;
    }

    for (const card of cards) {
      try {
        const id = await card.getAttribute("data-id") ?? `post-${i}-${Date.now()}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const linkEl = await card.$('a[href*="/feed/update/"]');
        const url = linkEl ? (await linkEl.getAttribute("href")) ?? "" : "";
        const fullUrl = url.startsWith("http") ? url : `https://www.linkedin.com${url}`;

        const authorEl = await card.$(".update-components-actor__name, [data-control-name='actor'] a");
        const authorName = authorEl ? (await authorEl.textContent())?.trim() ?? "Unknown" : "Unknown";
        let authorLink: string | undefined;
        if (authorEl) {
          try {
            authorLink = await authorEl.evaluate((el) => (el.closest("a") as HTMLAnchorElement)?.href);
          } catch {
            authorLink = undefined;
          }
        }

        const contentEl = await card.$(".feed-shared-inline-show-more-text, .update-components-text");
        const content = contentEl ? (await contentEl.textContent())?.trim() ?? "" : "";

        const reactionsEl = await card.$('[data-id="social-details-social-counts__reactions-count"], [aria-label*="reaction"]');
        const reactions = extractNumber(reactionsEl ? await reactionsEl.textContent() : null);

        const commentsEl = await card.$('[data-id="social-details-social-counts__comments-count"], [aria-label*="comment"]');
        const comments = extractNumber(commentsEl ? await commentsEl.textContent() : null);

        const hashtags = (content.match(/#\w+/g) ?? []).map((h) => h.slice(1));

        posts.push({
          id: id.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 100),
          url: fullUrl,
          authorName,
          authorProfileUrl: authorLink,
          content: content.slice(0, 2000),
          reactions,
          comments,
          hashtags,
          commentSnippets: [],
        });

        if (posts.length >= MAX_POSTS) break;
      } catch (_) {
        // skip malformed cards or stale elements
      }
    }

    if (posts.length >= MAX_POSTS) break;

    // Stop after several consecutive iterations with no new posts (e.g. you manually scrolled and then stopped)
    if (posts.length === countAtStart) {
      noNewPostsCount++;
      if (noNewPostsCount >= NO_NEW_POSTS_EXIT) {
        console.log(`No new posts for ${NO_NEW_POSTS_EXIT} iterations; stopping. Collected ${posts.length} posts.`);
        break;
      }
    } else {
      noNewPostsCount = 0;
    }

    // Scroll the feed: find every scrollable element on the page and scroll it, then CDP wheel + keyboard.
    try {
      const scrollChunk = 800;
      const vw = 1280;
      const vh = 800;

      // 1) Find EVERY scrollable element (including inside shadow roots), sort by scrollHeight, scroll top 5
      await page.evaluate((chunk: number) => {
        const scrollables: HTMLElement[] = [];
        const walk = (root: Element) => {
          const el = root as HTMLElement;
          if (el.scrollHeight > el.clientHeight && typeof el.scrollTop === "number") scrollables.push(el);
          Array.from(root.children).forEach(walk);
          const shadow = (root as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
          if (shadow) Array.from(shadow.children).forEach(walk);
        };
        walk(document.body);
        walk(document.documentElement);
        scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight);
        for (let i = 0; i < Math.min(5, scrollables.length); i++) {
          const el = scrollables[i];
          el.scrollTop = Math.min(el.scrollTop + chunk, el.scrollHeight - el.clientHeight);
        }
        window.scrollBy(0, chunk);
        document.documentElement.scrollTop = Math.min(document.documentElement.scrollTop + chunk, document.documentElement.scrollHeight - window.innerHeight);
      }, scrollChunk);

      await sleep(500);

      // 2) CDP: raw mouse wheel at viewport center (bypasses normal targeting)
      try {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: vw / 2,
          y: vh / 2,
          deltaX: 0,
          deltaY: 1200,
        });
        await cdp.detach();
      } catch (_) {}

      await sleep(400);

      // 3) Click inside first feed post then Page Down (focus scrollable region)
      const firstCard = await page.$('div[data-id^="urn:li:activity"]');
      if (firstCard) {
        const box = await firstCard.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + 100);
          await sleep(300);
          for (let k = 0; k < 6; k++) {
            await page.keyboard.press("PageDown");
            await sleep(250);
          }
        }
      }

      // 4) Scroll-all-scrollables again (same walk + shadow roots)
      await page.evaluate((chunk: number) => {
        const scrollables: HTMLElement[] = [];
        const walk = (root: Element) => {
          const el = root as HTMLElement;
          if (el.scrollHeight > el.clientHeight && typeof el.scrollTop === "number") scrollables.push(el);
          Array.from(root.children).forEach(walk);
          const shadow = (root as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
          if (shadow) Array.from(shadow.children).forEach(walk);
        };
        walk(document.body);
        walk(document.documentElement);
        scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight);
        for (let i = 0; i < Math.min(5, scrollables.length); i++) {
          const el = scrollables[i];
          el.scrollTop = Math.min(el.scrollTop + chunk, el.scrollHeight - el.clientHeight);
        }
      }, scrollChunk);
    } catch (_) {}
    await sleep(2500);
  }

  await context.close();

  fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2), "utf-8");
  console.log(`Wrote ${posts.length} posts to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
