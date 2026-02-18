"use client";

import { useState, useCallback } from "react";
import type { AnalysisConfig } from "@/lib/types";
import { defaultAnalysisConfig } from "@/lib/default-config";

interface ConfigFormProps {
  initialConfig: AnalysisConfig | null;
  onSave: (config: AnalysisConfig) => void;
  onNext: () => void;
}

export function ConfigForm({
  initialConfig,
  onSave,
  onNext,
}: ConfigFormProps) {
  const [config, setConfig] = useState<AnalysisConfig>(() => {
    const base = { ...defaultAnalysisConfig, ...initialConfig };
    if (base.minReposts === undefined) base.minReposts = defaultAnalysisConfig.minReposts;
    return base;
  });
  const [watchlistText, setWatchlistText] = useState(
    (initialConfig?.watchlist ?? []).join("\n")
  );
  const [hashtagsText, setHashtagsText] = useState(() => {
    const tags = initialConfig?.hashtags ?? [];
    return Array.isArray(tags) ? tags.filter(Boolean).join("\n") : "";
  });

  const update = useCallback(
    <K extends keyof AnalysisConfig>(key: K, value: AnalysisConfig[K]) => {
      setConfig((c) => ({ ...c, [key]: value }));
    },
    []
  );

  const handleSave = () => {
    const watchlist = watchlistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const hashtags = (hashtagsText || "")
      .split("\n")
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean);
    onSave({ ...config, watchlist, hashtags: hashtags.length ? hashtags : [] });
    onNext();
  };

  const inputClass =
    "mt-1.5 block w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--linkedin-blue)] focus:ring-1 focus:ring-[var(--linkedin-blue)]";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="rounded-[var(--radius)] border border-gray-200 bg-white p-6 shadow-[var(--shadow)] sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900">Analysis rules</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        A post is shortlisted if it matches <strong>any</strong> rule below. To get shortlists from typical feed data, add <strong>hashtags</strong> and/or <strong>watchlist</strong> authors; high-engagement needs min reactions, comments, and reposts (visible on each post).
      </p>

      {/* Limits */}
      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-gray-900">Limits</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Max posts to analyze</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={config.maxPosts}
              onChange={(e) => update("maxPosts", parseInt(e.target.value, 10) || 500)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Shortlist size</span>
            <input
              type="number"
              min={1}
              max={200}
              value={config.shortlistSize}
              onChange={(e) =>
                update("shortlistSize", parseInt(e.target.value, 10) || 50)
              }
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      {/* Engagement (high-engagement rule) */}
      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-gray-900">High-engagement rule</legend>
        <p className="mt-1 text-xs text-[var(--text-muted)]">All three thresholds must be met (reactions, comments, reposts).</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Min reactions</span>
            <input
              type="number"
              min={0}
              value={config.minReactions}
              onChange={(e) =>
                update("minReactions", parseInt(e.target.value, 10) || 0)
              }
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Min comments</span>
            <input
              type="number"
              min={0}
              value={config.minComments}
              onChange={(e) =>
                update("minComments", parseInt(e.target.value, 10) || 0)
              }
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Min reposts</span>
            <input
              type="number"
              min={0}
              value={config.minReposts ?? 10}
              onChange={(e) =>
                update("minReposts", parseInt(e.target.value, 10) || 0)
              }
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      {/* Mentions me */}
      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-gray-900">Mentions me</legend>
        <label className="mt-3 block">
          <span className={labelClass}>LinkedIn username (from profile URL)</span>
          <input
            type="text"
            value={config.mentionKeyword}
            onChange={(e) => update("mentionKeyword", e.target.value)}
            placeholder="e.g. deepaksshettigar"
            className={inputClass}
          />
        </label>
      </fieldset>

      {/* Watchlist & hashtags */}
      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-gray-900">Watchlist & hashtags</legend>
        <div className="mt-3 space-y-4">
          <label className="block">
            <span className={labelClass}>Watchlist (one per line)</span>
            <textarea
              rows={3}
              value={watchlistText}
              onChange={(e) => setWatchlistText(e.target.value)}
              placeholder="Author name or profile URL"
              className={`${inputClass} resize-y`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Hashtags (one per line, # optional)</span>
            <textarea
              rows={2}
              value={hashtagsText}
              onChange={(e) => setHashtagsText(e.target.value)}
              placeholder="e.g. leadership&#10;AI&#10;CareerGrowth"
              className={`${inputClass} resize-y`}
            />
            {!hashtagsText.trim() && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">Leave empty to skip hashtag matching.</p>
            )}
          </label>
        </div>
      </fieldset>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-[var(--radius-sm)] bg-[var(--linkedin-blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow)] hover:bg-[var(--linkedin-dark)] transition-colors"
        >
          Save & continue →
        </button>
      </div>
    </div>
  );
}
