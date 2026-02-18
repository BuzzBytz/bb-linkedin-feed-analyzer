"use client";

import { useState } from "react";
import type { PostAnalysis, ReactionType } from "@/types";
import { ExternalLink, ThumbsUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";

const REACTION_EMOJI: Record<ReactionType, string> = {
  Like: "👍",
  Respect: "🙏",
  Support: "❤️",
  Insightful: "💡",
};

export function PostCard({ analysis }: { analysis: PostAnalysis }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const { post, matchSummary, suggestedReaction, repostComment, replyComment } =
    analysis;

  return (
    <article className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-linkedin-light hover:underline font-medium flex items-center gap-1"
            >
              {post.authorName}
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
            <p className="text-slate-400 text-sm">
              {post.authorFollowers.toLocaleString()} followers · {post.reactions}{" "}
              reactions · {post.comments} comments
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
              "bg-slate-700/80 text-slate-200"
            )}
            title={`Suggested: ${suggestedReaction}`}
          >
            <span>{REACTION_EMOJI[suggestedReaction]}</span>
            <span>{suggestedReaction}</span>
          </div>
        </div>

        <p className="text-slate-300 text-sm mb-4 line-clamp-3">{post.content}</p>

        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Why it matched
            </h4>
            <p className="text-slate-300 text-sm">{matchSummary}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              Comment for repost
              <button
                onClick={() => copyToClipboard(repostComment, "repost")}
                className="text-slate-500 hover:text-linkedin-light flex items-center gap-1 text-xs font-normal"
              >
                {copiedField === "repost" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </h4>
            <p className="text-slate-200 text-sm bg-slate-900/50 rounded-lg p-3">
              {repostComment}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              Comment for reply
              <button
                onClick={() => copyToClipboard(replyComment, "reply")}
                className="text-slate-500 hover:text-linkedin-light flex items-center gap-1 text-xs font-normal"
              >
                {copiedField === "reply" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </h4>
            <p className="text-slate-200 text-sm bg-slate-900/50 rounded-lg p-3">
              {replyComment}
            </p>
          </div>
        </div>

        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-linkedin-light hover:text-linkedin-blue text-sm font-medium"
        >
          Open post on LinkedIn
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </article>
  );
}
