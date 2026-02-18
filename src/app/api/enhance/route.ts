import { NextRequest, NextResponse } from "next/server";
import type { ShortlistMatch, PostAnalysis, ReactionType } from "@/types";

const REACTIONS: ReactionType[] = ["Like", "Respect", "Support", "Insightful"];
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || "http://localhost:1234/v1";

function buildPrompt(match: ShortlistMatch): string {
  const { post, matchedCriteria } = match;
  const criteriaStr = matchedCriteria.join("; ");

  return `You are a LinkedIn engagement assistant. Analyze this post and provide structured output.

POST CONTENT:
${post.content.slice(0, 1500)}

AUTHOR: ${post.authorName} (${post.authorFollowers.toLocaleString()} followers)
ENGAGEMENT: ${post.reactions} reactions, ${post.comments} comments
MATCHED CRITERIA: ${criteriaStr}

Respond in this EXACT format (each section on its own line, no extra text):
SUMMARY: [1-2 sentence summary of why this post is worth engaging with]
REACTION: [One of: Like, Respect, Support, Insightful - choose the most appropriate]
REPOST_COMMENT: [1-2 sentence comment to add when reposting - should add value, be relevant and timely]
REPLY_COMMENT: [1-2 sentence comment to post as reply - touch emotional chord, be relevant, encourage discussion]`;
}

async function callHuggingFace(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HF API: ${response.status}`);
  }

  const data = (await response.json()) as
    | { generated_text?: string }
    | Array<{ generated_text: string }>;
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim();
  }
  return ((data as { generated_text?: string }).generated_text ?? "").trim();
}

async function callLMStudio(prompt: string, model: string): Promise<string> {
  const response = await fetch(`${LMSTUDIO_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "local-model",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`LMStudio: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function parseLLMResponse(
  text: string,
  match: ShortlistMatch
): Omit<PostAnalysis, "post" | "matchReasons"> {
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]+?)(?=REACTION:|$)/);
  const reactionMatch = text.match(
    /REACTION:\s*(Like|Respect|Support|Insightful)/i
  );
  const repostMatch = text.match(/REPOST_COMMENT:\s*([\s\S]+?)(?=REPLY_COMMENT:|$)/);
  const replyMatch = text.match(/REPLY_COMMENT:\s*([\s\S]+?)$/);

  const suggestedReaction = reactionMatch
    ? (REACTIONS.find(
        (r) => r.toLowerCase() === reactionMatch[1].toLowerCase()
      ) ?? "Like")
    : "Like";

  return {
    matchSummary:
      summaryMatch?.[1]?.trim() || match.matchedCriteria.join(". "),
    suggestedReaction,
    repostComment:
      repostMatch?.[1]?.trim() ||
      `Thanks for sharing, ${match.post.authorName}!`,
    replyComment:
      replyMatch?.[1]?.trim() || `Really appreciate this perspective.`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shortlist } = body as { shortlist: ShortlistMatch[] };

    if (!Array.isArray(shortlist) || shortlist.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: shortlist array required" },
        { status: 400 }
      );
    }

    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    const useLMStudio = process.env.USE_LMSTUDIO === "true";
    const hfModel = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
    const lmModel = process.env.LMSTUDIO_MODEL || "local-model";

    const hasLLM = hfApiKey || useLMStudio;

    const results: PostAnalysis[] = [];

    for (const match of shortlist) {
      const prompt = buildPrompt(match);

      try {
        let text = "";
        if (hfApiKey && !useLMStudio) {
          text = await callHuggingFace(prompt, hfApiKey, hfModel);
        } else if (useLMStudio) {
          text = await callLMStudio(prompt, lmModel);
        }

        const parsed = parseLLMResponse(text || "", match);

        results.push({
          post: match.post,
          matchReasons: match.reasons,
          ...parsed,
        });
      } catch (err) {
        console.error("LLM error for post:", match.post.id, err);
        results.push({
          post: match.post,
          matchReasons: match.reasons,
          ...parseLLMResponse("", match),
        });
      }
    }

    return NextResponse.json({
      posts: results,
      usedAI: hasLLM,
    });
  } catch (error) {
    console.error("Enhance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enhancement failed" },
      { status: 500 }
    );
  }
}
