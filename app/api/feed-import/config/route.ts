import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function envInt(key: string, fallback: number, max?: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return max != null ? Math.min(n, max) : n;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const maxPosts = envInt("NEXT_PUBLIC_DEFAULT_MAX_POSTS", 100, 500);
  const scrollPauseMs = envInt("EXTENSION_SCROLL_PAUSE_MS", 2500);
  const noNewPostsExit = envInt("EXTENSION_NO_NEW_POSTS_EXIT", 6);
  const maxPostsFallback = envInt("EXTENSION_MAX_POSTS_FALLBACK", 200, 500);
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3001";

  return NextResponse.json(
    {
      maxPosts,
      scrollPauseMs,
      noNewPostsExit,
      maxPostsFallback,
      appOrigin,
    },
    { headers: corsHeaders }
  );
}
