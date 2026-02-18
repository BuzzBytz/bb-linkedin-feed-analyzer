import { NextRequest, NextResponse } from "next/server";
import { analyzeFeed } from "@/lib/analyzer";
import type { LinkedInPost, AnalysisConfig } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { posts, config } = body as {
      posts: LinkedInPost[];
      config: AnalysisConfig;
    };

    if (!Array.isArray(posts) || !config) {
      return NextResponse.json(
        { error: "Invalid request: posts array and config required" },
        { status: 400 }
      );
    }

    const shortlist = analyzeFeed(posts, config);

    return NextResponse.json({
      shortlist,
      totalAnalyzed: Math.min(posts.length, config.maxPostsToAnalyze),
      shortlistedCount: shortlist.length,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
