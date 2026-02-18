// Raw post as captured from LinkedIn feed (or imported JSON)
export interface FeedPost {
  id: string;
  url: string;
  authorName: string;
  authorProfileUrl?: string;
  authorFollowers?: number;
  content: string;
  reactions?: number;
  comments?: number;
  reposts?: number;
  hashtags?: string[];
  postedAt?: string; // ISO date
  commentSnippets?: string[]; // first N comments for "mentions me" check
}

// Analysis config (rule-based criteria)
export interface AnalysisConfig {
  maxPosts: number;
  shortlistSize: number;
  minFollowers: number; // kept for compatibility; not used for shortlisting
  minReactions: number;
  minComments: number;
  minReposts: number;
  mentionKeyword: string; // your LinkedIn username – post or comment mentioning you gets shortlisted
  watchlist: string[]; // author names or profile URLs
  hashtags: string[]; // any of these hashtags (without #)
}

// Why a post was shortlisted (rule-based)
export type ShortlistReason =
  | "high_engagement" // min reactions, comments, reposts (from config)
  | "mentions_me"
  | "watchlist_author"
  | "hashtag_match";

export interface ShortlistedPost extends FeedPost {
  shortlistReasons: ShortlistReason[];
}

// AI enrichment for each shortlisted post (LinkedIn reaction set)
export type ReactionType = "Like" | "Celebrate" | "Support" | "Love" | "Insightful" | "Funny";

export interface PostEnrichment {
  postId: string;
  summary: string; // how it matches shortlisting criteria
  suggestedReaction: ReactionType;
  commentForRepost: string;
  commentForReply: string;
}

/** Explains why 0 shortlists (for UI when nothing matches). */
export interface ExclusionSummary {
  totalPosts: number;
  configHashtags: number;
  configWatchlist: number;
  hasMentionKeyword: boolean;
  feedPostsWithContent: number;
  feedPostsWithHashtags: number;
  feedPostsWithReactionsOrComments: number;
  feedPostsWithReposts: number; // posts that have reposts count captured
  highEngagementThresholds: { minReactions: number; minComments: number; minReposts: number };
  whyNoShortlists: string[]; // human-readable reasons
}

export interface AnalysisResult {
  config: AnalysisConfig;
  totalAnalyzed: number;
  shortlisted: ShortlistedPost[];
  enrichments: PostEnrichment[]; // same order as shortlisted, by postId
  exclusionSummary?: ExclusionSummary; // set when shortlisted.length === 0
}
