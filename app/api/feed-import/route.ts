import { NextResponse } from "next/server";
import { writeCapture, getLatestCapture } from "@/lib/capture-storage";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const posts = Array.isArray(body.posts) ? body.posts : [];
    const filePath = writeCapture(posts);
    return NextResponse.json(
      { success: true, count: posts.length, savedTo: filePath },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, message: "Failed to save" }, { status: 500, headers: corsHeaders });
  }
}

export async function GET() {
  try {
    const posts = getLatestCapture();
    return NextResponse.json(
      { posts: Array.isArray(posts) ? posts : [] },
      { headers: corsHeaders }
    );
  } catch (e) {
    return NextResponse.json({ posts: [] }, { headers: corsHeaders });
  }
}
