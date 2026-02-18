/**
 * Hybrid approach (1): Playwright only scrolls and collects post URN + URL.
 * Output: .feed-urns.json — array of { urn, url } for use with LinkedIn API.
 *
 * Run: npx tsx scripts/capture-feed-urns.ts
 * Env: same as capture-feed.ts (CAPTURE_HEADLESS, MAX_POSTS, OUT_FILE, etc.)
 */

import "dotenv/config";
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const MAX_POSTS = parseInt(process.env.MAX_POSTS ?? "500", 10);
const OUT_FILE = process.env.OUT_URNS_FILE ?? path.join(process.cwd(), ".feed-urns.json");
const USER_DATA_DIR = process.env.USER_DATA_DIR;
const HEADLESS =
  process.env.CAPTURE_HEADLESS === "true" ||
  process.env.HEADLESS === "1" ||
  process.env.HEADLESS === "true";
const NO_NEW_POSTS_EXIT = Math.max(1, parseInt(process.env.CAPTURE_NO_NEW_POSTS_EXIT ?? "3", 10));

interface UrnEntry {
  urn: string;
  url: string;
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
    { headless: HEADLESS, channel: "chromium", viewport: { width: 1280, height: 800 } }
  );

  const page = await context.newPage();
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForSelector('div[data-id^="urn:li:activity"]', { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const entries: UrnEntry[] = [];
  const seen = new Set<string>();
  let noNewCount = 0;

  for (let i = 0; i < MAX_POSTS; i++) {
    const countAtStart = entries.length;
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
        const urn = (await card.getAttribute("data-id"))?.trim();
        if (!urn || seen.has(urn)) continue;
        seen.add(urn);
        const linkEl = await card.$('a[href*="/feed/update/"]');
        const href = linkEl ? (await linkEl.getAttribute("href")) ?? "" : "";
        const url = href.startsWith("http") ? href : `https://www.linkedin.com${href}`;
        entries.push({ urn, url });
        if (entries.length >= MAX_POSTS) break;
      } catch (_) {}
    }

    if (entries.length >= MAX_POSTS) break;
    if (entries.length === countAtStart) {
      noNewCount++;
      if (noNewCount >= NO_NEW_POSTS_EXIT) {
        console.log(`No new URNs for ${NO_NEW_POSTS_EXIT} iterations; stopping. Collected ${entries.length} URNs.`);
        break;
      }
    } else {
      noNewCount = 0;
    }

    try {
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
        for (let j = 0; j < Math.min(5, scrollables.length); j++) {
          const el = scrollables[j];
          el.scrollTop = Math.min(el.scrollTop + chunk, el.scrollHeight - el.clientHeight);
        }
        window.scrollBy(0, chunk);
      }, 800);
      const firstCard = await page.$('div[data-id^="urn:li:activity"]');
      if (firstCard) {
        const box = await firstCard.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + 100);
          await sleep(200);
          for (let k = 0; k < 4; k++) {
            await page.keyboard.press("PageDown");
            await sleep(200);
          }
        }
      }
    } catch (_) {}
    await sleep(2500);
  }

  await context.close();
  fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`Wrote ${entries.length} URNs to ${OUT_FILE}. Next: use LinkedIn API to fetch post details (dashboard or API).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
