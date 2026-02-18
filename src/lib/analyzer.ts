import type {
  LinkedInPost,
  AnalysisConfig,
  ShortlistMatch,
  MatchReason,
} from "@/types";

/**
 * Rule-based analysis: shortlist posts based on configurable criteria
 */
export function analyzeFeed(
  posts: LinkedInPost[],
  config: AnalysisConfig
): ShortlistMatch[] {
  const shortlist: ShortlistMatch[] = [];
  const maxToAnalyze = Math.min(posts.length, config.maxPostsToAnalyze);
  const postsToAnalyze = posts.slice(0, maxToAnalyze);

  const mentionLower = config.mentionKeyword.toLowerCase();

  for (const post of postsToAnalyze) {
    const reasons: MatchReason[] = [];
    const matchedCriteria: string[] = [];

    // High engagement: 10k+ followers AND 500+ reactions AND 100+ comments
    if (
      post.authorFollowers >= config.minFollowers &&
      post.reactions >= config.minReactions &&
      post.comments >= config.minComments
    ) {
      reasons.push("high_engagement");
      matchedCriteria.push(
        `High engagement (${post.authorFollowers.toLocaleString()} followers, ${post.reactions} reactions, ${post.comments} comments)`
      );
    }

    // Mentions "me" in post or comments
    const contentLower = post.content.toLowerCase();
    const mentionsInContent = contentLower.includes(mentionLower);
    const mentionsInComments =
      post.commentsPreview?.some((c) =>
        c.toLowerCase().includes(mentionLower)
      ) ?? false;
    if (config.mentionKeyword && (mentionsInContent || mentionsInComments)) {
      reasons.push("mentions_me");
      matchedCriteria.push(`Mentions "${config.mentionKeyword}"`);
    }

    // Watchlist author
    const authorMatch = config.watchlist.some((w) => {
      const wLower = w.toLowerCase();
      return (
        post.authorName.toLowerCase().includes(wLower) ||
        (post.authorProfileUrl?.toLowerCase().includes(wLower) ?? false)
      );
    });
    if (authorMatch) {
      reasons.push("watchlist");
      matchedCriteria.push(`Author in watchlist`);
    }

    // Hashtag match
    const postHashtags = post.hashtags.map((h) => h.toLowerCase());
    const matchedHashtags = config.hashtags.filter((h) =>
      postHashtags.includes(h.toLowerCase())
    );
    if (matchedHashtags.length > 0) {
      reasons.push("hashtag");
      matchedCriteria.push(`Hashtags: ${matchedHashtags.join(", ")}`);
    }

    if (reasons.length > 0) {
      shortlist.push({ post, reasons, matchedCriteria });
    }
  }

  // Sort by number of match reasons (more = higher priority), then by engagement
  shortlist.sort((a, b) => {
    if (a.reasons.length !== b.reasons.length) {
      return b.reasons.length - a.reasons.length;
    }
    const engagementA =
      a.post.reactions * 2 + a.post.comments * 5 + a.post.authorFollowers / 1000;
    const engagementB =
      b.post.reactions * 2 + b.post.comments * 5 + b.post.authorFollowers / 1000;
    return engagementB - engagementA;
  });

  return shortlist.slice(0, config.shortlistSize);
}
