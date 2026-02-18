// Feed post as captured from LinkedIn (or imported)
export interface LinkedInPost {
  id: string;
  url: string;
  authorName: string;
  authorProfileUrl?: string;
  authorFollowers: number;
  content: string;
  reactions: number;
  comments: number;
  reposts?: number;
  postedAt: string; // ISO date
  hashtags: string[];
  commentsPreview?: string[]; // First few comments for "mentions me" check
}

// Configuration for analysis criteria
export interface AnalysisConfig {
  maxPostsToAnalyze: number;
  shortlistSize: number;
  minFollowers: number;
  minReactions: number;
  minComments: number;
  watchlist: string[]; // Author names or profile URLs
  hashtags: string[];
  mentionKeyword: string; // e.g., your name for "mentions me"
}

// Match reason for shortlisting
export type MatchReason =
  | "high_engagement"
  | "mentions_me"
  | "watchlist"
  | "hashtag";

export interface ShortlistMatch {
  post: LinkedInPost;
  reasons: MatchReason[];
  matchedCriteria: string[];
}

// AI-enhanced analysis result
export type ReactionType = "Like" | "Respect" | "Support" | "Insightful";

export interface PostAnalysis {
  post: LinkedInPost;
  matchReasons: MatchReason[];
  matchSummary: string;
  suggestedReaction: ReactionType;
  repostComment: string;
  replyComment: string;
}

export interface AnalysisResult {
  analyzedAt: string;
  totalPostsAnalyzed: number;
  shortlistedCount: number;
  posts: PostAnalysis[];
  config: AnalysisConfig;
}
