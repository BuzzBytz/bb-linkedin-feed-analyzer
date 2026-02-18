import type {
  FeedPost,
  AnalysisConfig,
  ShortlistedPost,
  ShortlistReason,
  ExclusionSummary,
} from "./types";

function matchesHighEngagement(post: FeedPost, config: AnalysisConfig): boolean {
  const reactions = post.reactions ?? 0;
  const comments = post.comments ?? 0;
  const reposts = post.reposts ?? 0;
  return (
    reactions >= config.minReactions &&
    comments >= config.minComments &&
    reposts >= config.minReposts
  );
}

function matchesMentionsMe(post: FeedPost, config: AnalysisConfig): boolean {
  const keyword = (config.mentionKeyword || "").trim().toLowerCase();
  if (!keyword) return false;
  const content = (post.content || "").toLowerCase();
  if (content.includes(keyword)) return true;
  const snippets = post.commentSnippets ?? [];
  return snippets.some((s) => s.toLowerCase().includes(keyword));
}

function matchesWatchlist(post: FeedPost, config: AnalysisConfig): boolean {
  const list = config.watchlist ?? [];
  if (!list.length) return false;
  const name = (post.authorName || "").trim().toLowerCase();
  const profile = (post.authorProfileUrl || "").toLowerCase();
  return list.some((w) => {
    const ww = w.trim().toLowerCase();
    return name.includes(ww) || ww.includes(name) || profile.includes(ww) || ww.includes(profile);
  });
}

function matchesHashtags(post: FeedPost, config: AnalysisConfig): boolean {
  const tags = config.hashtags ?? [];
  if (!tags.length) return false;
  const postTags = (post.hashtags ?? []).map((h) => h.replace(/^#/, "").toLowerCase());
  const content = (post.content || "").toLowerCase();
  return tags.some((t) => {
    const tt = t.replace(/^#/, "").toLowerCase();
    return postTags.includes(tt) || content.includes(`#${tt}`);
  });
}

export function getShortlistReasons(
  post: FeedPost,
  config: AnalysisConfig
): ShortlistReason[] {
  const reasons: ShortlistReason[] = [];
  if (matchesHighEngagement(post, config)) reasons.push("high_engagement");
  if (matchesMentionsMe(post, config)) reasons.push("mentions_me");
  if (matchesWatchlist(post, config)) reasons.push("watchlist_author");
  if (matchesHashtags(post, config)) reasons.push("hashtag_match");
  return reasons;
}

export function shortlistPosts(
  posts: FeedPost[],
  config: AnalysisConfig
): ShortlistedPost[] {
  const capped = posts.slice(0, config.maxPosts);
  const withReasons: ShortlistedPost[] = [];
  for (const post of capped) {
    const reasons = getShortlistReasons(post, config);
    if (reasons.length > 0) {
      withReasons.push({ ...post, shortlistReasons: reasons });
    }
  }
  return withReasons.slice(0, config.shortlistSize);
}

/**
 * Builds an explanation of why no posts were shortlisted (for UI when shortlist is empty).
 */
export function computeExclusionSummary(
  posts: FeedPost[],
  config: AnalysisConfig
): ExclusionSummary {
  const capped = posts.slice(0, config.maxPosts);
  let feedPostsWithContent = 0;
  let feedPostsWithHashtags = 0;
  let feedPostsWithReactionsOrComments = 0;
  let feedPostsWithReposts = 0;
  for (const p of capped) {
    if ((p.content || "").trim().length > 0) feedPostsWithContent++;
    if ((p.hashtags ?? []).length > 0) feedPostsWithHashtags++;
    if ((p.reactions ?? 0) > 0 || (p.comments ?? 0) > 0) feedPostsWithReactionsOrComments++;
    if (p.reposts != null && p.reposts > 0) feedPostsWithReposts++;
  }
  const configHashtags = (config.hashtags ?? []).filter(Boolean).length;
  const configWatchlist = (config.watchlist ?? []).filter(Boolean).length;
  const hasMentionKeyword = (config.mentionKeyword ?? "").trim().length > 0;
  const whyNoShortlists: string[] = [];

  if (configHashtags === 0) {
    whyNoShortlists.push(
      feedPostsWithHashtags > 0
        ? `Hashtag rule is off (no hashtags in config). ${feedPostsWithHashtags} post(s) in the feed have hashtags—add some in Config (e.g. Leadership, AI) to shortlist them.`
        : "Hashtag rule is off (no hashtags in config). Add hashtags in Config to shortlist posts that contain them."
    );
  }
  if (configWatchlist === 0) {
    whyNoShortlists.push("Watchlist is empty. Add author names or profile URLs in Config to shortlist their posts.");
  }
  if (!hasMentionKeyword) {
    whyNoShortlists.push("Mentions-me rule is off (no LinkedIn username in config). Set it in Config to shortlist posts or comments that mention you.");
  }
  const needR = config.minReactions;
  const needC = config.minComments;
  const needRep = config.minReposts;
  if (feedPostsWithReactionsOrComments === 0) {
    whyNoShortlists.push(
      `High-engagement rule: no posts have reaction or comment counts in the feed. So none can meet min ${needR} reactions and ${needC} comments.`
    );
  } else if (feedPostsWithReposts === 0) {
    whyNoShortlists.push(
      `High-engagement rule: no posts have repost counts in the feed. Rule requires ≥${needR} reactions, ≥${needC} comments, ≥${needRep} reposts—re-capture with the extension to get repost data.`
    );
  } else {
    whyNoShortlists.push(
      `High-engagement rule requires all of: ≥${needR} reactions, ≥${needC} comments, ≥${needRep} reposts. ${feedPostsWithReposts} post(s) have repost data; adjust thresholds in Config if needed.`
    );
  }
  if (feedPostsWithContent === 0 && configHashtags > 0) {
    whyNoShortlists.push("No posts in the feed have captured content (many show empty). Hashtag match needs content or hashtag metadata; try re-capturing with the extension after expanding \"See more\" on posts.");
  }

  return {
    totalPosts: capped.length,
    configHashtags,
    configWatchlist,
    hasMentionKeyword,
    feedPostsWithContent,
    feedPostsWithHashtags,
    feedPostsWithReactionsOrComments,
    feedPostsWithReposts,
    highEngagementThresholds: { minReactions: needR, minComments: needC, minReposts: needRep },
    whyNoShortlists,
  };
}
