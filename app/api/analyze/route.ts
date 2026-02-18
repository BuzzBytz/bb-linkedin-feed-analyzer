import { NextResponse } from "next/server";
import { shortlistPosts, computeExclusionSummary } from "@/lib/analyze";
import type { FeedPost, AnalysisConfig, AnalysisResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { posts, config } = body as {
      posts: FeedPost[];
      config: AnalysisConfig;
    };
    if (!Array.isArray(posts) || !config) {
      return NextResponse.json(
        { message: "Expected { posts: FeedPost[], config: AnalysisConfig }" },
        { status: 400 }
      );
    }
    const shortlisted = shortlistPosts(posts, config);
    const result: Omit<AnalysisResult, "enrichments"> = {
      config,
      totalAnalyzed: Math.min(posts.length, config.maxPosts),
      shortlisted,
      ...(shortlisted.length === 0
        ? { exclusionSummary: computeExclusionSummary(posts, config) }
        : {}),
    };
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
