/**
 * Buzz Bytz Feed Capture - runs on linkedin.com/feed.
 * No filtering: gathers metadata for all visible posts up to app max (NEXT_PUBLIC_DEFAULT_MAX_POSTS).
 * Finds the real scroll container, scrolls it, collects posts, sends to app. Shortlisting and AI happen in the dashboard.
 */

(function () {
  const DEFAULTS = {
    appOrigin: "http://localhost:3001",
    maxPostsFallback: 200,
    scrollPauseMs: 2500,
    noNewPostsExit: 6,
  };

  function isScrollable(el) {
    if (!el || el === document.body) return false;
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY || style.overflow;
    const canScroll = el.scrollHeight > el.clientHeight && typeof el.scrollTop === "number";
    const allowsScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    return canScroll && (allowsScroll || el.scrollHeight > el.clientHeight + 100);
  }

  function scrollContainerFromElement(start) {
    if (!start) return null;
    let el = start.parentElement;
    while (el && el !== document.body) {
      if (isScrollable(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function findScrollContainer() {
    const feedCardSelectors = [
      'div[data-id^="urn:li:activity"]',
      'div[data-id*="urn:li:activity"]',
      'article',
      'a[href*="/feed/update/"]',
    ];
    for (const sel of feedCardSelectors) {
      const first = document.querySelector(sel);
      const container = scrollContainerFromElement(first);
      if (container) return container;
    }
    const main = document.querySelector("main");
    if (main) {
      const fromMain = scrollContainerFromElement(main) || (isScrollable(main) ? main : null);
      if (fromMain) return fromMain;
    }
    const scrollables = document.querySelectorAll("div");
    for (const el of scrollables) {
      if (isScrollable(el) && el.querySelector('a[href*="/feed/update/"]')) return el;
    }
    return null;
  }

  function parseCount(text) {
    if (!text) return undefined;
    const n = text.replace(/\D/g, "");
    return n ? parseInt(n, 10) : undefined;
  }

  function getFeedCards(scope) {
    const root = scope || document;
    const cards = new Set();
    const inScope = (el) => !scope || scope.contains(el);
    const add = (el) => { if (el && el !== document.body && inScope(el)) cards.add(el); };

    const byDataId = root.querySelectorAll('div[data-id^="urn:li:activity"], div[data-id*="urn:li:activity"], [data-urn*="activity"]');
    byDataId.forEach(add);
    const byArticle = root.querySelectorAll("article");
    byArticle.forEach(add);
    const linkSelectors = [
      'a[href*="/feed/update/"]',
      'a[href*="/feed/update"]',
      'a[href*="urn:li:activity"]',
      'a[href*="feed/update"]',
      'a[href="feed/update"]',
      'a[href^="feed/update"]',
      'a[href*="activity"]',
    ];
    linkSelectors.forEach((sel) => {
      try {
        root.querySelectorAll(sel).forEach((a) => {
          const card = a.closest("article") || a.closest('div[data-id]') || a.closest(".feed-shared-update-v2") || a.closest("[data-id]") || a.closest("[data-urn]") || a.closest(".scaffold-layout__main-column div") || a.parentElement?.closest("div");
          add(card);
        });
      } catch (_) {}
    });

    const withSocialButtons = root.querySelectorAll(
      '[aria-label*="Like"], [aria-label*="like"], [aria-label*="Comment"], [aria-label*="comment"], [aria-label*="Repost"], [data-control-name*="like"], [data-control-name*="comment"]'
    );
    withSocialButtons.forEach((el) => {
      const card = el.closest("article") || el.closest('div[data-id]') || el.closest(".feed-shared-update-v2") || el.closest("div[data-id]") || el.closest("[data-urn]") || el.closest("div");
      add(card);
    });
    if (cards.size > 0) return Array.from(cards);

    const main = root.querySelector("main") || root;
    const articlesInMain = main.querySelectorAll("article");
    if (articlesInMain.length > 0) {
      articlesInMain.forEach(add);
      if (cards.size > 0) return Array.from(cards);
    }

    const anyDataId = root.querySelectorAll('div[data-id]');
    anyDataId.forEach((el) => {
      const id = (el.getAttribute("data-id") || "").toLowerCase();
      if (id.includes("urn") || id.includes("activity") || id.length > 20) add(el);
    });

    const engagementButtons = root.querySelectorAll(
      'button[aria-label*="Like"], button[aria-label*="like"], button[aria-label*="Comment"], button[aria-label*="comment"], [role="button"][aria-label*="Like"], [role="button"][aria-label*="Comment"], span[aria-label*="Like"], span[aria-label*="Comment"]'
    );
    engagementButtons.forEach((btn) => {
      let el = btn.parentElement;
      let card = null;
      for (let i = 0; i < 25 && el && el !== document.body; i++) {
        const text = (el.textContent || "").trim();
        const hasLike = el.querySelector('[aria-label*="Like"], [aria-label*="like"]');
        const hasComment = el.querySelector('[aria-label*="Comment"], [aria-label*="comment"]');
        if (hasLike && hasComment && text.length > 40) {
          card = el;
          break;
        }
        el = el.parentElement;
      }
      if (card) add(card);
    });

    const byClass = root.querySelectorAll('[class*="feed-shared-update"], [class*="feed-shared-inline"], [class*="update-components-actor"], [class*="update-components-text"], [class="feed-shared-update"], [class="update-components-actor"]');
    byClass.forEach((el) => {
      if (!el.classList || el.classList.length === 0) return;
      const c = (el.getAttribute("class") || "").toLowerCase();
      if (c.includes("feed-shared-update") || c.includes("feed-shared-inline") || (c.includes("update-components") && (c.includes("actor") || c.includes("text")))) add(el);
    });

    return Array.from(cards);
  }

  function dedupeCardsByContainment(cardList) {
    return cardList.filter((c) => !cardList.some((other) => other !== c && other.contains(c)));
  }

  function getFeedCardsWithFallback(container) {
    const main = document.querySelector("main");
    let cards = container ? getFeedCards(container) : [];
    if (cards.length === 0) cards = getFeedCards(null);
    if (main && cards.length > 0) {
      const inMain = cards.filter((c) => main.contains(c));
      if (inMain.length > 0) cards = inMain;
    }
    if (cards.length === 0 && container) cards = getFeedCards(container);
    if (cards.length === 0 && main) cards = getFeedCards(main);
    if (cards.length === 0) cards = getFeedCards(null);
    cards = dedupeCardsByContainment(cards);
    return cards;
  }

  function cleanAuthorName(raw) {
    if (!raw || raw === "Unknown") return raw;
    let t = raw.replace(/\s*•\s*Following.*$/i, "").replace(/\s*•\s*\d+(?:st|nd|rd|th)\+?.*$/i, "").replace(/\s*•\s*.*$/, "");
    t = t.replace(/\s*Author\s*.*$/i, "").replace(/\s*\d{1,3}(,\d{3})*\s*followers.*$/i, "").replace(/\s{2,}/g, " ").trim().slice(0, 100);
    return t || "Unknown";
  }

  function getAuthorFromCard(card) {
    const profileLinks = card.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
    for (const a of profileLinks) {
      const t = (a.textContent || "").trim();
      if (t.length > 0 && t.length < 200 && !/^[\s•·\-]+$/i.test(t) && !/^\d+\s*comments?$/i.test(t)) return cleanAuthorName(t);
    }
    const sel = ".update-components-actor__name, [data-control-name='actor'] a, [data-test-id='actor'], [class*='actor__name']";
    const el = card.querySelector(sel);
    if (el) {
      const t = (el.textContent || "").trim();
      if (t.length > 0 && t.length < 200) return cleanAuthorName(t);
    }
    const skip = /^(Like|Comment|Repost|Send|Follow|\.\.\.|·|\d+)$/i;
    const spans = card.querySelectorAll("span");
    for (const s of spans) {
      const t = (s.textContent || "").trim();
      if (t.length >= 2 && t.length <= 80 && !t.includes("\n") && !skip.test(t) && !/•\s*Following/i.test(t) && !/\d{1,3}\s*(comments?|reposts?|reactions?)/i.test(t)) return cleanAuthorName(t);
    }
    return "Unknown";
  }

  function authorFromContentFallback(content) {
    if (!content || content.length < 2) return "Unknown";
    const stripped = content.replace(/\s*\d{1,2}[dhm]\s*$/i, "").trim();
    const beforeDegree = stripped.split(/\s*•\s*\d+(?:st|nd|rd|th)\+?\s*/i)[0].trim();
    const beforeAuthor = stripped.split(/\s+Author\s*/i)[0].trim();
    const beforeBullet = stripped.split(/\s*•\s*Following/i)[0].trim();
    const beforeFollowers = stripped.split(/\d{1,3}(,\d{3})*\s*followers/i)[0].trim();
    let best = beforeAuthor;
    if (beforeDegree.length >= 2 && beforeDegree.length <= 100) best = beforeDegree;
    if (beforeBullet.length >= 2 && beforeBullet.length < best.length) best = beforeBullet;
    if (beforeFollowers.length >= 2 && beforeFollowers.length < best.length) best = beforeFollowers;
    best = best.replace(/\s{2,}/g, " ").trim();
    if (best.length >= 2 && best.length <= 100) return best;
    return "Unknown";
  }

  function stripHeaderFromContent(raw) {
    if (!raw || raw.length < 10) return raw;
    const hasTrailingTime = /\d+[w]\s*$/i.test(raw) || /\d{1,2}[dhm]\s*$/i.test(raw);
    let t = raw.replace(/\s*\d{1,2}[dhm]\s*$/i, "").replace(/\s*\d+[w]\s*$/i, "").trim();
    const connectionDegree = /\s*•\s*\d+(?:st|nd|rd|th)\+?\s+[A-Z]/.test(t);
    const looksLikeHeadline = t.length < 400 && /\|/.test(t) && hasTrailingTime;
    const looksLikeHeaderOnly =
      t.length < 380 &&
      (connectionDegree || /Author\s*[A-Z@]/.test(t) || /\s*•\s*Following\s*/.test(t) || /\d{1,3}(,\d{3})*\s*followers\d{0,2}[dhm]?\s*$/i.test(t));
    if ((looksLikeHeaderOnly || looksLikeHeadline) && !/\n\n/.test(t)) return "";
    t = t.replace(/^[\s\S]*?\s*•\s*\d+(?:st|nd|rd|th)\+?\s*/i, "").trim();
    t = t.replace(/^[\s\S]*?\s*•\s*Following\s*/i, "").trim();
    const m = t.match(/^[\s\S]*?\s+Author\s+/i);
    if (m) {
      const after = t.slice(m[0].length).trim();
      if (after.length > 10 && !/^\d{1,3}(,\d{3})*\s*followers/i.test(after)) t = after;
    }
    if (/^\d{1,3}(,\d{3})*\s*followers/i.test(t) || t.length < 15) return "";
    return t.slice(0, 2000);
  }

  function looksLikeActorHeadline(text) {
    if (!text || text.length < 20 || text.length > 350) return false;
    return (/\d+[w]\s*$/.test(text) || /\d{1,2}[dhm]\s*$/.test(text)) && /\|/.test(text);
  }

  function getContentFromCard(card) {
    const actorRoot = card.querySelector('[class*="update-components-actor"]');
    const sel = ".feed-shared-inline-show-more-text, .update-components-text, [data-test-id='post-message'], [class*='update-components-text'], [class*='feed-shared-inline'], [class*='break-words'], [class*='feed-shared-update-v2__description'], [class*='feed-shared-text']";
    const candidates = Array.from(card.querySelectorAll(sel)).filter(
      (el) => !actorRoot || !actorRoot.contains(el)
    );
    const withContent = candidates
      .map((el) => (el.textContent || "").trim())
      .filter((t) => t.length > 30 && !/^\d{1,2}[dhm]\s*$/i.test(t) && !looksLikeActorHeadline(t));
    for (const t of withContent) {
      const cleaned = stripHeaderFromContent(t.slice(0, 2000));
      if (cleaned.length > 20) return cleaned;
    }
    const allText = (card.textContent || "").trim();
    if (allText.length < 30) return "";
    const lines = allText.split(/\n/).map((l) => l.trim()).filter(Boolean);
    let start = 0;
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      if (lines[i].match(/\d{1,2}[dhm]\s*$/) || lines[i].match(/\d+[w]\s*$/) || (lines[i].includes("•") && lines[i].length < 120)) start = i + 1;
    }
    let body = lines.slice(start).join("\n").trim();
    if (body.length <= 20) body = allText;
    return stripHeaderFromContent(body.slice(0, 2000));
  }

  function getPostLinkFromCard(card) {
    const linkSel = 'a[href*="/feed/update/"], a[href*="/feed/update"], a[href*="urn:li:activity"], a[href*="feed/update"], a[href="feed/update"], a[href^="feed/update"], a[href*="activity"]';
    const link = card.querySelector(linkSel);
    if (!link) return "";
    const url = (link.getAttribute("href") || "").trim();
    return url.startsWith("http") ? url : url ? "https://www.linkedin.com" + (url.startsWith("/") ? url : "/" + url) : "";
  }

  function cardDedupeKey(card) {
    const dataId = (card.getAttribute("data-id") || "").trim();
    if (dataId.length > 10) return dataId;
    const profileHref = (card.querySelector("a[href*='/in/'], a[href*='/company/']")?.getAttribute("href") || "").trim();
    const snippet = (card.textContent || "").replace(/\s+/g, " ").slice(0, 220);
    return (profileHref + " " + snippet).trim() || (card.textContent || "").replace(/\s+/g, " ").slice(0, 300);
  }

  function isPromotedCard(card) {
    const text = (card.textContent || "").trim();
    return /\bPromoted\b/i.test(text) || /\bSponsored\b/i.test(text);
  }

  function tryExpandSeeMore(card) {
    const links = card.querySelectorAll('button[aria-expanded], span[aria-expanded], [class*="see-more"], [class*="show-more"], a');
    for (const el of links) {
      const t = (el.textContent || "").trim().toLowerCase();
      if (t === "see more" || t === "… more" || t === "more" || (t.includes("more") && t.length < 15)) {
        try {
          el.click();
          return true;
        } catch (_) {}
      }
    }
    const spans = card.querySelectorAll("span");
    for (const s of spans) {
      const t = (s.textContent || "").trim().toLowerCase();
      if (t === "… more" || t === "see more" || (t === "more" && !s.querySelector("span"))) {
        try {
          s.click();
          return true;
        } catch (_) {}
      }
    }
    return false;
  }

  /** Parse number from "5,000", "1.2K", "5K", "1M", "1.2M" etc. */
  function parseFollowerCount(str) {
    if (!str || typeof str !== "string") return undefined;
    const s = str.replace(/,/g, "").trim();
    const comma = /^(\d{1,3}(?:\d{3})*)$/.exec(s);
    if (comma) return parseInt(comma[1], 10);
    const k = /^(\d+(?:\.\d+)?)\s*[Kk]$/.exec(s);
    if (k) return Math.round(parseFloat(k[1]) * 1000);
    const m = /^(\d+(?:\.\d+)?)\s*[Mm]$/.exec(s);
    if (m) return Math.round(parseFloat(m[1]) * 1000000);
    const num = parseInt(s.replace(/\D/g, ""), 10);
    return Number.isNaN(num) ? undefined : num;
  }

  function getAuthorFollowersFromCard(card) {
    // Prefer actor/header block where "Name • X followers • 2d" usually appears
    const actorRoot = card.querySelector('[class*="update-components-actor"], [class*="feed-shared-actor"], [class*="actor"]');
    const searchRoot = actorRoot || card;
    const text = (searchRoot.textContent || "").trim();
    // Match: "5,000 followers", "5,000+ followers", "1.2K followers", "5K followers", "1M followers"
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*\+?\s*followers?/i,
      /(\d+(?:\.\d+)?)\s*[KkMm]\s*followers?/i,
      /(\d+(?:\d{3})*)\s*\+?\s*followers?/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const n = parseFollowerCount(m[1].replace(/\s*\+/g, ""));
        if (n != null && n > 0) return n;
      }
    }
    // Fallback: full card (e.g. when actor structure differs)
    if (searchRoot === card) return undefined;
    const fullText = (card.textContent || "").trim();
    for (const re of patterns) {
      const m = fullText.match(re);
      if (m) {
        const n = parseFollowerCount(m[1].replace(/\s*\+/g, ""));
        if (n != null && n > 0) return n;
      }
    }
    return undefined;
  }

  function parseEngagementCount(str) {
    if (!str) return undefined;
    const s = str.replace(/,/g, "").trim();
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return n;
    const k = /^(\d+(?:\.\d+)?)\s*[Kk]$/.exec(s);
    if (k) return Math.round(parseFloat(k[1]) * 1000);
    const m = /^(\d+(?:\.\d+)?)\s*[Mm]$/.exec(s);
    if (m) return Math.round(parseFloat(m[1]) * 1000000);
    return parseCount(str) ?? undefined;
  }

  function parseReactionsCommentsRepostsFromCard(card) {
    const text = (card.textContent || "").trim();
    let reactions, comments, reposts;
    const r = text.match(/(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?\s*[KkMm]?)\s*reactions?/i);
    if (r) reactions = parseEngagementCount(r[1]);
    const c = text.match(/(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?\s*[KkMm]?)\s*comments?/i);
    if (c) comments = parseEngagementCount(c[1]);
    const rep = text.match(/(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?\s*[KkMm]?)\s*reposts?/i);
    if (rep) reposts = parseEngagementCount(rep[1]);
    return { reactions, comments, reposts };
  }

  function getCommentSnippetsFromCard(card) {
    const snippets = [];
    const sel = "[class*='comment'], [class*='comments'], [data-id*='comment'], [class*='social-details']";
    const nodes = card.querySelectorAll(sel);
    const seen = new Set();
    for (const el of nodes) {
      const t = (el.textContent || "").trim();
      if (t.length < 20 || t.length > 500) continue;
      if (/^(Like|Reply|Comment|Send|•\d+[dhmw]|View \d+ comment)/i.test(t)) continue;
      const key = t.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      snippets.push(t.slice(0, 400));
      if (snippets.length >= 5) break;
    }
    if (snippets.length > 0) return snippets;
    const allSpans = card.querySelectorAll("span");
    for (const s of allSpans) {
      const t = (s.textContent || "").trim();
      if (t.length >= 25 && t.length <= 400 && !s.querySelector("span")) {
        if (/^(Like|Reply|Comment|Send|Follow|•)/i.test(t)) continue;
        const key = t.slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        snippets.push(t.slice(0, 400));
        if (snippets.length >= 5) break;
      }
    }
    return snippets;
  }

  function buildPostFromCard(card, indexRef) {
    const fullUrl = getPostLinkFromCard(card);
    let content = getContentFromCard(card);
    let authorName = getAuthorFromCard(card);
    if (authorName === "Unknown" && content) authorName = authorFromContentFallback(content);
    if (authorName === "Unknown" && !(content || "").trim()) return null;
    const rawId = card.getAttribute("data-id") || fullUrl || "";
    let baseId = rawId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
    if (!baseId) {
      baseId = (authorName + " " + (content || "").slice(0, 150)).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80) || "post";
    }
    const id = baseId + "_" + indexRef.current++;
    const reactionsSelectors = [
      "[data-id='social-details-social-counts__reactions-count']",
      "[aria-label*='reaction']",
      "[class*='social-details-social-counts']",
      "[class*='reactions-count']",
      "span[class*='social-details']",
    ];
    const commentsSelectors = [
      "[data-id='social-details-social-counts__comments-count']",
      "[aria-label*='comment']",
      "[class*='comments-count']",
    ];
    const repostsSelectors = [
      "[aria-label*='repost']",
      "[class*='reposts-count']",
      "[class*='repost']",
    ];
    let reactions = undefined;
    let comments = undefined;
    let reposts = undefined;
    for (const sel of reactionsSelectors) {
      const el = card.querySelector(sel);
      if (el) {
        const n = parseEngagementCount((el.textContent || "").trim()) ?? parseCount(el.textContent);
        if (n != null) { reactions = n; break; }
      }
    }
    for (const sel of commentsSelectors) {
      const el = card.querySelector(sel);
      if (el) {
        const n = parseEngagementCount((el.textContent || "").trim()) ?? parseCount(el.textContent);
        if (n != null) { comments = n; break; }
      }
    }
    for (const sel of repostsSelectors) {
      const el = card.querySelector(sel);
      if (el) {
        const n = parseEngagementCount((el.textContent || "").trim()) ?? parseCount(el.textContent);
        if (n != null) { reposts = n; break; }
      }
    }
    const fallback = parseReactionsCommentsRepostsFromCard(card);
    if (reactions == null && fallback.reactions != null) reactions = fallback.reactions;
    if (comments == null && fallback.comments != null) comments = fallback.comments;
    if (reposts == null && fallback.reposts != null) reposts = fallback.reposts;
    const authorFollowers = getAuthorFollowersFromCard(card);
    const hashtags = ((content || "").match(/#\w+/g) || []).map((h) => h.slice(1));
    const commentSnippets = getCommentSnippetsFromCard(card);
    return {
      id,
      url: fullUrl || "https://www.linkedin.com/feed/",
      authorName,
      content: content || "",
      reactions,
      comments,
      reposts,
      authorFollowers,
      hashtags,
      commentSnippets,
      _dedupeKey: cardDedupeKey(card),
    };
  }

  function collectVisiblePosts(scope) {
    let cards = getFeedCardsWithFallback(scope);
    cards = cards.filter((card) => !isPromotedCard(card));
    const posts = [];
    const indexRef = { current: 0 };
    cards.forEach((card) => {
      const p = buildPostFromCard(card, indexRef);
      if (p) posts.push(p);
    });
    return posts;
  }

  async function collectVisiblePostsWithExpand(scope) {
    let cards = getFeedCardsWithFallback(scope);
    cards = cards.filter((card) => !isPromotedCard(card));
    for (const card of cards) {
      tryExpandSeeMore(card);
      await new Promise((r) => setTimeout(r, 90));
    }
    await new Promise((r) => setTimeout(r, 200));
    const posts = [];
    const indexRef = { current: 0 };
    cards.forEach((card) => {
      const p = buildPostFromCard(card, indexRef);
      if (p) posts.push(p);
    });
    return posts;
  }

  function showStatus(msg, isError = false) {
    let el = document.getElementById("buzz-bytz-capture-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "buzz-bytz-capture-status";
      el.style.cssText =
        "position:fixed;top:80px;right:20px;z-index:999999;max-width:320px;padding:12px 16px;border-radius:8px;font-family:system-ui;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.15);";
      document.body.appendChild(el);
    }
    el.style.background = isError ? "#fef2f2" : "#eff6ff";
    el.style.color = isError ? "#991b1b" : "#1e40af";
    el.textContent = msg;
    el.style.display = "block";
    return el;
  }

  async function capture() {
    let appOrigin = DEFAULTS.appOrigin;
    let maxPosts = DEFAULTS.maxPostsFallback;
    let scrollPauseMs = DEFAULTS.scrollPauseMs;
    let noNewPostsExit = DEFAULTS.noNewPostsExit;
    try {
      const configRes = await fetch(DEFAULTS.appOrigin + "/api/feed-import/config");
      if (configRes.ok) {
        const data = await configRes.json().catch(() => ({}));
        if (data.appOrigin) appOrigin = data.appOrigin;
        if (typeof data.maxPosts === "number" && data.maxPosts >= 1) maxPosts = Math.min(data.maxPosts, 500);
        if (typeof data.scrollPauseMs === "number" && data.scrollPauseMs >= 500) scrollPauseMs = data.scrollPauseMs;
        if (typeof data.noNewPostsExit === "number" && data.noNewPostsExit >= 1) noNewPostsExit = data.noNewPostsExit;
        if (typeof data.maxPosts === "number" && data.maxPosts >= 1) maxPosts = Math.min(data.maxPosts, 500);
        else if (typeof data.maxPostsFallback === "number" && data.maxPostsFallback >= 1) maxPosts = Math.min(data.maxPostsFallback, 500);
      }
    } catch (_) {}

    const cfgFromApp = maxPosts !== DEFAULTS.maxPostsFallback || scrollPauseMs !== DEFAULTS.scrollPauseMs || noNewPostsExit !== DEFAULTS.noNewPostsExit;
    if (cfgFromApp) {
      showStatus("Using config from app (.env).", false);
      await new Promise((r) => setTimeout(r, 1200));
    }

    let container = findScrollContainer();
    if (!container) {
      showStatus("Waiting for feed… scroll the page once if needed.", false);
      await new Promise((r) => setTimeout(r, 2500));
      container = findScrollContainer();
    }
    if (!container) {
      showStatus("Could not find feed scroll area. Scroll down once, then try again.", true);
      return;
    }

    showStatus("Waiting for feed to render…", false);
    await new Promise((r) => setTimeout(r, 2800));

    const seen = new Set();
    const allPosts = [];
    let noNewCount = 0;
    let noCardsCount = 0;
    let scrollRounds = 0;
    const minScrollRounds = 12;
    showStatus("Capturing… 0 / " + maxPosts + " posts. Scrolling feed…");

    function doScroll() {
      const step = 600;
      const max = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.min(container.scrollTop + step, max);
      container.dispatchEvent(new Event("scroll", { bubbles: true }));
    }

    while (allPosts.length < maxPosts) {
      let batch = await collectVisiblePostsWithExpand(container);
      if (batch.length === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        batch = await collectVisiblePostsWithExpand(container);
      }
      let added = 0;
      batch.forEach((p) => {
        const key = p._dedupeKey;
        delete p._dedupeKey;
        if (seen.has(key)) return;
        seen.add(key);
        allPosts.push(p);
        added++;
      });

      if (batch.length === 0) {
        noCardsCount++;
        if (noCardsCount >= 4) {
          showStatus("No feed cards found after several tries. Total: " + allPosts.length + " posts.");
          break;
        }
      } else {
        noCardsCount = 0;
        const canExitNoNew = scrollRounds >= minScrollRounds;
        if (added === 0) {
          noNewCount++;
          if (canExitNoNew && noNewCount >= noNewPostsExit) {
            showStatus("No new posts for " + noNewPostsExit + " rounds. Stopped. Total: " + allPosts.length + " posts.");
            break;
          }
        } else {
          noNewCount = 0;
        }
      }

      scrollRounds++;
      const cardsThisRound = batch.length;
      showStatus("Found " + cardsThisRound + " card(s), " + added + " new. Total: " + allPosts.length + " / " + maxPosts + ". Scrolling…");

      for (let s = 0; s < 3; s++) {
        doScroll();
        await new Promise((r) => setTimeout(r, scrollPauseMs / 2));
      }
      await new Promise((r) => setTimeout(r, scrollPauseMs));

      if (allPosts.length >= maxPosts) {
        showStatus("Reached max " + maxPosts + " posts.");
        break;
      }
    }

    try {
      const res = await fetch(appOrigin + "/api/feed-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: allPosts }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showStatus("Sent " + allPosts.length + " posts to Buzz Bytz. Open the dashboard and click 'Load last capture'.", false);
      } else {
        showStatus("App not reachable (is it running on " + appOrigin + "?). Copying to clipboard.", true);
        await navigator.clipboard.writeText(JSON.stringify(allPosts, null, 2));
        showStatus("Copied " + allPosts.length + " posts to clipboard. Paste in the dashboard.", false);
      }
    } catch (e) {
      await navigator.clipboard.writeText(JSON.stringify(allPosts, null, 2));
      showStatus("Copied " + allPosts.length + " posts to clipboard. Paste in the dashboard. (App not reachable.)", false);
    }
  }

  function injectButton() {
    if (document.getElementById("buzz-bytz-capture-btn")) return;
    const btn = document.createElement("button");
    btn.id = "buzz-bytz-capture-btn";
    btn.textContent = "Capture feed for Buzz Bytz";
    btn.style.cssText =
      "position:fixed;top:80px;right:20px;z-index:999999;padding:10px 16px;border-radius:8px;border:1px solid #0a66c2;background:#0a66c2;color:#fff;font-family:system-ui;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);";
    btn.onmouseover = () => (btn.style.background = "#004182");
    btn.onmouseout = () => (btn.style.background = "#0a66c2");
    btn.onclick = () => capture();
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton);
  } else {
    injectButton();
  }
})();
