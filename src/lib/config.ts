import type { AnalysisConfig } from "@/types";

export const DEFAULT_CONFIG: AnalysisConfig = {
  maxPostsToAnalyze: 500,
  shortlistSize: 50,
  minFollowers: 10000,
  minReactions: 500,
  minComments: 100,
  watchlist: [],
  hashtags: [],
  mentionKeyword: "",
};

export function loadConfig(): AnalysisConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem("linkedin-analysis-config");
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AnalysisConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AnalysisConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("linkedin-analysis-config", JSON.stringify(config));
}
