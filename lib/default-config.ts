import type { AnalysisConfig } from "./types";

function envInt(key: string, fallback: number): number {
  if (typeof process.env[key] === "undefined") return fallback;
  const n = parseInt(process.env[key]!, 10);
  return Number.isNaN(n) ? fallback : n;
}

function envStr(key: string, fallback: string): string {
  const v = process.env[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

// Defaults are fallbacks only when env is unset; set NEXT_PUBLIC_DEFAULT_* in .env to override.
// High-engagement rule uses reactions, comments, reposts only (follower count ignored for now).
export const defaultAnalysisConfig: AnalysisConfig = {
  maxPosts: envInt("NEXT_PUBLIC_DEFAULT_MAX_POSTS", 100),
  shortlistSize: envInt("NEXT_PUBLIC_DEFAULT_SHORTLIST_SIZE", 10),
  minFollowers: envInt("NEXT_PUBLIC_DEFAULT_MIN_FOLLOWERS", 0),
  minReactions: envInt("NEXT_PUBLIC_DEFAULT_MIN_REACTIONS", 100),
  minComments: envInt("NEXT_PUBLIC_DEFAULT_MIN_COMMENTS", 20),
  minReposts: envInt("NEXT_PUBLIC_DEFAULT_MIN_REPOSTS", 10),
  mentionKeyword: envStr("NEXT_PUBLIC_MY_LINKEDIN_USERNAME", ""),
  watchlist: [],
  hashtags: [],
};
