import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

const CAPTURE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const OUTPUT_FILE = path.join(process.cwd(), ".feed-urns.json");

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxPosts = Math.min(
      Math.max(1, Number(body.maxPosts) || 100),
      500
    );
    const headless =
      body.headless !== undefined
        ? Boolean(body.headless)
        : process.env.CAPTURE_HEADLESS === "true";

    const env = {
      ...process.env,
      MAX_POSTS: String(maxPosts),
      OUT_URNS_FILE: OUTPUT_FILE,
      HEADLESS: headless ? "1" : "0",
    };

    const scriptPath = path.join(process.cwd(), "scripts", "capture-feed-urns.ts");

    const child = spawn("npx", ["tsx", scriptPath], {
      env,
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stderrChunks: Buffer[] = [];
    child.stderr?.on("data", (chunk) => stderrChunks.push(chunk));

    const completed = await new Promise<{ ok: boolean; code: number | null }>(
      (resolve) => {
        const timer = setTimeout(() => {
          child.kill("SIGTERM");
          resolve({ ok: false, code: null });
        }, CAPTURE_TIMEOUT_MS);

        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ ok: code === 0, code });
        });
      }
    );

    if (!completed.ok) {
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");
      return NextResponse.json(
        {
          message:
            completed.code === null
              ? "Capture timed out. Try a lower max posts."
              : `Capture failed (exit ${completed.code}). ${stderr || "See server logs."}`,
        },
        { status: 500 }
      );
    }

    if (!fs.existsSync(OUTPUT_FILE)) {
      return NextResponse.json(
        { message: "Capture finished but no output file was written." },
        { status: 500 }
      );
    }

    const raw = fs.readFileSync(OUTPUT_FILE, "utf-8");
    let urns: unknown;
    try {
      urns = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { message: "Output file was not valid JSON." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      urns: Array.isArray(urns) ? urns : [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        message:
          e instanceof Error ? e.message : "Failed to start capture script.",
      },
      { status: 500 }
    );
  }
}
