import { NextResponse } from "next/server";
import type { ShortlistedPost, AnalysisConfig, PostEnrichment, ReactionType } from "@/lib/types";

const REACTIONS: ReactionType[] = ["Like", "Celebrate", "Support", "Love", "Insightful", "Funny"];

function getModelLabel(): string {
  const hfUrl = process.env.HUGGINGFACE_INFERENCE_URL || "";
  const lmUrl = process.env.LMSTUDIO_BASE_URL || "";
  if (lmUrl) return `LMStudio (${lmUrl})`;
  if (hfUrl) return `Hugging Face Inference (${hfUrl})`;
  return "none (using defaults)";
}

function getDefaultEnrichment(post: ShortlistedPost): PostEnrichment {
  const reasons = post.shortlistReasons.join(", ");
  const author = post.authorName && post.authorName !== "Unknown" ? post.authorName : "the author";
  return {
    postId: post.id,
    summary: `Shortlisted because: ${reasons}. Author: ${post.authorName}; engagement: ${post.reactions ?? 0} reactions, ${post.comments ?? 0} comments.`,
    suggestedReaction: "Like",
    commentForRepost: `Noted — ${author}'s post stood out. Add your own take when reposting.`,
    commentForReply: `Add a short reply that references something specific from ${author}'s post above.`,
  };
}

async function enrichWithLM(
  post: ShortlistedPost,
  config: AnalysisConfig
): Promise<PostEnrichment> {
  // Hugging Face Inference (default). Optional: LMSTUDIO_BASE_URL for local model.
  const hfUrl = process.env.HUGGINGFACE_INFERENCE_URL || "";
  const lmStudioUrl = process.env.LMSTUDIO_BASE_URL || "";
  const baseUrl = hfUrl || lmStudioUrl;
  const apiKey = process.env.HUGGINGFACE_API_KEY || "";

  const reasons = post.shortlistReasons.join(", ");
  const fullContent = (post.content || "").trim();
  const contentForPrompt = fullContent.slice(0, 3000);
  const hasMoreContent = fullContent.length > 3000;
  const topComments = (post.commentSnippets || []).slice(0, 5).filter(Boolean);
  const commentsBlock =
    topComments.length > 0
      ? `\nExisting comments (for context — write a reply that adds a new angle, don't repeat these):\n${topComments.map((c, i) => `${i + 1}. ${c.slice(0, 400)}`).join("\n")}\n`
      : "";

  const prompt = `You are an expert at LinkedIn engagement. Write UNIQUE suggestions for THIS post only. Do NOT use generic phrases like "Thanks for sharing", "Worth a read", or "Great perspective". Reference specific ideas, topics, or a concrete detail from the post so each suggestion feels tailored.${commentsBlock ? " Use the existing comments only as context; your reply should add a distinct perspective." : ""}

Respond with exactly 4 lines, no other text:
Line 1: One sentence on why this post was shortlisted (criteria: ${reasons}) and what stands out.
Line 2: Exactly one word - the best reaction: Like, Celebrate, Support, Love, Insightful, or Funny.
Line 3: A short comment for REPOSTING (1-2 sentences). Add value; mention something specific from the post (e.g. a point, stat, or idea) so it's clearly about this post.
Line 4: A short comment to REPLY to the original post (1-2 sentences). Be specific to the author's message; avoid generic praise.${topComments.length > 0 ? " Do not simply echo the existing comments above." : ""}

Post author: ${post.authorName}
Post content (full):
${contentForPrompt}${hasMoreContent ? "…" : ""}${commentsBlock}`;

  if (baseUrl) {
    try {
      const isLMStudio = lmStudioUrl !== "" && baseUrl === lmStudioUrl;
      const body = isLMStudio
        ? { prompt, max_tokens: 500, temperature: 0.6 }
        : {
            inputs: prompt,
            parameters: { max_new_tokens: 500, temperature: 0.6 },
          };
      const res = await fetch(isLMStudio ? `${baseUrl}/v1/completions` : baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = isLMStudio
        ? (data.choices?.[0]?.text ?? "")
        : (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) ?? "";
      const lines = text
        .trim()
        .split(/\n+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      const defaultEn = getDefaultEnrichment(post);
      const summary = lines[0] || defaultEn.summary;
      const reactionLine = (lines[1] ?? "").toLowerCase();
      const suggestedReaction: ReactionType =
        REACTIONS.find((r) => reactionLine === r.toLowerCase() || reactionLine.startsWith(r.toLowerCase())) ?? "Like";
      const commentForRepost = (lines[2] || defaultEn.commentForRepost).slice(0, 500);
      const commentForReply = (lines[3] || defaultEn.commentForReply).slice(0, 500);
      return {
        postId: post.id,
        summary,
        suggestedReaction,
        commentForRepost,
        commentForReply,
      };
    } catch (err) {
      console.warn("LM/HF enrich failed for post", post.id, err);
    }
  }
  return getDefaultEnrichment(post);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shortlisted, config, stream: wantStream } = body as {
      shortlisted: ShortlistedPost[];
      config: AnalysisConfig;
      stream?: boolean;
    };
    if (!Array.isArray(shortlisted)) {
      return NextResponse.json(
        { message: "Expected { shortlisted: ShortlistedPost[], config }" },
        { status: 400 }
      );
    }

    const total = shortlisted.length;
    const modelLabel = getModelLabel();
    console.log(`[enrich] Model: ${modelLabel}. Enriching ${total} post(s).`);

    if (wantStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const write = (obj: { type: string; message?: string; enrichments?: PostEnrichment[] }) => {
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          };
          write({ type: "log", message: `[enrich] Model: ${modelLabel}. Enriching ${total} post(s).` });
          const enrichments: PostEnrichment[] = [];
          for (let i = 0; i < shortlisted.length; i++) {
            const post = shortlisted[i];
            const n = i + 1;
            const msgStart = `Enriching ${n}/${total} (${post.authorName || post.id})…`;
            console.log(`[enrich] ${msgStart}`);
            write({ type: "log", message: `[enrich] ${msgStart}` });
            const t0 = Date.now();
            const enrichment = await enrichWithLM(post, config ?? {});
            enrichments.push(enrichment);
            const durationMs = Date.now() - t0;
            const msgDone = `Done in ${durationMs}ms.`;
            console.log(`[enrich] ${msgDone}`);
            write({ type: "log", message: `[enrich] ${msgDone}` });
          }
          console.log(`[enrich] All ${total} post(s) done.`);
          write({ type: "log", message: `[enrich] All ${total} post(s) done.` });
          write({ type: "done", enrichments });
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      });
    }

    const enrichments: PostEnrichment[] = [];
    for (let i = 0; i < shortlisted.length; i++) {
      const post = shortlisted[i];
      const n = i + 1;
      console.log(`[enrich] ${n}/${total} (${post.authorName || post.id})…`);
      const t0 = Date.now();
      const enrichment = await enrichWithLM(post, config ?? {});
      enrichments.push(enrichment);
      console.log(`[enrich] Done in ${Date.now() - t0}ms.`);
    }
    console.log(`[enrich] All ${total} post(s) done.`);
    return NextResponse.json({ enrichments });
  } catch (e) {
    console.error("[enrich]", e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Enrichment failed" },
      { status: 500 }
    );
  }
}
