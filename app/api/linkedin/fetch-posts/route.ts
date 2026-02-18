import { NextResponse } from "next/server";
import { fetchPostByUrn } from "@/lib/linkedin-api";

const DELAY_MS = 500; // avoid rate limits

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token?.trim()) {
    return NextResponse.json(
      { message: "LINKEDIN_ACCESS_TOKEN is not set. Add it to .env (see env.example)." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    let urns: { urn: string; url: string }[] = [];
    if (Array.isArray(body.urns)) {
      urns = body.urns.map((u: string | { urn: string; url: string }) =>
        typeof u === "string" ? { urn: u, url: `https://www.linkedin.com/feed/update/${encodeURIComponent(u)}/` } : u
      );
    } else if (Array.isArray(body)) {
      urns = body.map((u: string | { urn: string; url: string }) =>
        typeof u === "string" ? { urn: u, url: `https://www.linkedin.com/feed/update/${encodeURIComponent(u)}/` } : u
      );
    }
    if (!urns.length) {
      return NextResponse.json(
        { message: "Expected body: { urns: Array<{ urn, url }> or string[] }" },
        { status: 400 }
      );
    }

    const posts: Awaited<ReturnType<typeof fetchPostByUrn>>[] = [];
    for (let i = 0; i < urns.length; i++) {
      const { urn, url } = urns[i];
      const post = await fetchPostByUrn(token, urn, url);
      posts.push(post);
      if (i < urns.length - 1) await sleep(DELAY_MS);
    }

    const valid = posts.filter((p): p is NonNullable<typeof p> => p != null);
    return NextResponse.json({
      success: true,
      posts: valid,
      skipped: posts.length - valid.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Fetch failed" },
      { status: 500 }
    );
  }
}
