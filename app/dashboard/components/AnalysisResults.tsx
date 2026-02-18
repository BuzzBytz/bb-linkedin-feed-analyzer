"use client";

import type { AnalysisResult as AnalysisResultType, PostEnrichment, ReactionType, ShortlistedPost } from "@/lib/types";

interface AnalysisResultsProps {
  result: AnalysisResultType;
  onBack: () => void;
  onEnrichRequest?: () => void | Promise<void>;
  enriching?: boolean;
  enrichLogs?: string[];
}

const REACTION_OPTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "Like", emoji: "👍", label: "Like" },
  { type: "Celebrate", emoji: "🎉", label: "Celebrate" },
  { type: "Support", emoji: "💪", label: "Support" },
  { type: "Love", emoji: "❤️", label: "Love" },
  { type: "Insightful", emoji: "💡", label: "Insightful" },
  { type: "Funny", emoji: "😂", label: "Funny" },
];

const reactionEmoji: Record<string, string> = {
  Like: "👍",
  Celebrate: "🎉",
  Support: "💪",
  Love: "❤️",
  Insightful: "💡",
  Funny: "😂",
  Respect: "🙏",
};

function getEnrichment(enrichments: PostEnrichment[], postId: string): PostEnrichment | undefined {
  return enrichments.find((e) => e.postId === postId);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function AnalysisResults({
  result,
  onBack,
  onEnrichRequest,
  enriching = false,
  enrichLogs = [],
}: AnalysisResultsProps) {
  const { shortlisted, enrichments, totalAnalyzed, exclusionSummary } = result;
  const hasEnrichments = enrichments.length > 0;
  const canEnrich = shortlisted.length > 0 && !hasEnrichments && onEnrichRequest;
  const showExclusionExplanation = shortlisted.length === 0 && exclusionSummary?.whyNoShortlists?.length;

  return (
    <div className="space-y-6">
      {/* Why 0 shortlists — exclusion explanation */}
      {showExclusionExplanation && (
        <div className="rounded-[var(--radius)] border border-amber-200 bg-amber-50/80 px-5 py-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            Why no shortlists?
          </h3>
          <p className="text-xs text-amber-800/90 mb-3">
            None of the {exclusionSummary!.totalPosts} captured posts matched your rules. Here’s what’s going on:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-amber-900">
            {exclusionSummary!.whyNoShortlists.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-800/90 mt-3">
            Adjust Config (hashtags, watchlist, mention keyword, or high-engagement thresholds) and run analysis again, or re-capture the feed after expanding &quot;See more&quot; on posts.
          </p>
        </div>
      )}

      {/* Summary bar */}
      <div className="rounded-[var(--radius)] border border-gray-200 bg-white px-6 py-4 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Analyzed {totalAnalyzed} posts → shortlisted {shortlisted.length}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {hasEnrichments
                ? "Use suggestions below to react, repost, or reply on LinkedIn."
                : canEnrich
                  ? "Add AI suggestions, then engage."
                  : "Open each post to engage."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-[var(--radius-sm)] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            {canEnrich && (
              <button
                type="button"
                onClick={onEnrichRequest}
                disabled={enriching}
                className="rounded-[var(--radius-sm)] bg-[var(--linkedin-blue)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow)] hover:bg-[var(--linkedin-dark)] disabled:opacity-60 transition-colors"
              >
                {enriching ? "Enriching…" : "Enrich with AI"}
              </button>
            )}
          </div>
        </div>
        {enriching && enrichLogs.length > 0 && (
          <div className="mt-3 rounded-[var(--radius-sm)] bg-gray-900 p-3">
            <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-300">
              {enrichLogs.join("\n")}
            </pre>
          </div>
        )}
      </div>

      {/* Post cards */}
      <div className="space-y-4">
        {shortlisted.map((post, index) => (
          <ShortlistedPostCard
            key={post.id}
            post={post}
            enrichment={getEnrichment(enrichments, post.id)}
            index={index + 1}
            reactionEmoji={reactionEmoji}
          />
        ))}
      </div>
    </div>
  );
}

function ShortlistedPostCard({
  post,
  enrichment,
  index,
  reactionEmoji,
}: {
  post: ShortlistedPost;
  enrichment: PostEnrichment | undefined;
  index: number;
  reactionEmoji: Record<string, string>;
}) {
  const suggestedReaction = enrichment?.suggestedReaction ?? "Like";

  return (
    <article className="rounded-[var(--radius)] border border-gray-200 bg-white shadow-[var(--shadow)] overflow-hidden">
      {/* Card header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">#{index}</span>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--linkedin-blue)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--linkedin-dark)] transition-colors"
          >
            Open on LinkedIn →
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-gray-900">{post.authorName}</span>
          {post.reactions != null && (
            <span className="text-[var(--text-muted)]">{post.reactions} reactions</span>
          )}
          {post.comments != null && (
            <span className="text-[var(--text-muted)]">{post.comments} comments</span>
          )}
          {post.reposts != null && (
            <span className="text-[var(--text-muted)]">{post.reposts} reposts</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {post.shortlistReasons.map((r) => (
            <span
              key={r}
              className="rounded-full bg-[var(--linkedin-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--linkedin-dark)]"
            >
              {r.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Excerpt */}
        <div>
          <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-[var(--radius-sm)] p-3">
            {post.content.slice(0, 400)}
            {post.content.length > 400 && "…"}
          </p>
        </div>

        {enrichment ? (
          <div className="space-y-4">
            {enrichment.summary && (
              <p className="text-sm text-[var(--text-muted)]">{enrichment.summary}</p>
            )}

            {/* Reaction: single highlighted suggestion */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Suggested reaction
              </p>
              <div className="flex flex-wrap gap-2">
                {REACTION_OPTIONS.map(({ type, emoji, label }) => (
                  <span
                    key={type}
                    className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-sm ${
                      type === suggestedReaction
                        ? "border-[var(--linkedin-blue)] bg-[var(--linkedin-blue)]/10 text-[var(--linkedin-dark)] font-semibold"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {emoji} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Repost & Reply in two columns on larger screens */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius-sm)] border border-amber-200/80 bg-amber-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1.5">
                  Repost comment
                </p>
                <div className="flex gap-2">
                  <p className="flex-1 min-w-0 text-sm text-gray-800 bg-white rounded border border-amber-200/80 p-2.5">
                    {enrichment.commentForRepost}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(enrichment.commentForRepost)}
                    className="shrink-0 rounded-[var(--radius-sm)] border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-emerald-200/80 bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1.5">
                  Reply comment
                </p>
                <div className="flex gap-2">
                  <p className="flex-1 min-w-0 text-sm text-gray-800 bg-white rounded border border-emerald-200/80 p-2.5">
                    {enrichment.commentForReply}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(enrichment.commentForReply)}
                    className="shrink-0 rounded-[var(--radius-sm)] border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No AI suggestions. Open the post above to engage manually, or run &quot;Enrich with AI&quot; above.
          </p>
        )}
      </div>
    </article>
  );
}
