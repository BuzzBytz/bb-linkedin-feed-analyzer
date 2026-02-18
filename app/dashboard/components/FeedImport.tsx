"use client";

import { useState } from "react";
import type { AnalysisConfig } from "@/lib/types";
import type { AnalysisResult } from "@/lib/types";
import { getUrnFromPostUrl, getPostUrlFromUrn } from "@/lib/linkedin-utils";
import { enrichWithStream } from "@/lib/enrich-client";

interface FeedImportProps {
  config: AnalysisConfig | null;
  feedJson: string;
  onFeedJsonChange: (v: string) => void;
  onAnalysisComplete: (result: AnalysisResult) => void;
  onBack: () => void;
}

export function FeedImport({
  config,
  feedJson,
  onFeedJsonChange,
  onAnalysisComplete,
  onBack,
}: FeedImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);
  const [fetchingFromApi, setFetchingFromApi] = useState(false);
  const [urnsJson, setUrnsJson] = useState("");
  const [postUrlInput, setPostUrlInput] = useState("");
  const [hybridStatus, setHybridStatus] = useState<string | null>(null);
  const [enrichLogs, setEnrichLogs] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const runShortlistOnly = async () => {
    if (!config) {
      setError("Save config first.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const parsed = JSON.parse(feedJson);
      const posts = Array.isArray(parsed) ? parsed : parsed.posts ?? parsed.feed ?? [];
      if (!posts.length) {
        setError("No posts in JSON. Expected array of post objects.");
        setAnalyzing(false);
        return;
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts, config }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      const analysis: Omit<AnalysisResult, "enrichments"> = await res.json();
      setAnalyzing(false);
      onAnalysisComplete({ ...analysis, enrichments: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shortlist failed.");
      setAnalyzing(false);
    }
  };

  const runShortlistAndEnrich = async () => {
    if (!config) {
      setError("Save config first.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const parsed = JSON.parse(feedJson);
      const posts = Array.isArray(parsed) ? parsed : parsed.posts ?? parsed.feed ?? [];
      if (!posts.length) {
        setError("No posts in JSON. Expected array of post objects.");
        setAnalyzing(false);
        return;
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts, config }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      const analysis: Omit<AnalysisResult, "enrichments"> = await res.json();
      setAnalyzing(false);

      setEnriching(true);
      setEnrichLogs([]);
      try {
        const enrichments = await enrichWithStream({
          shortlisted: analysis.shortlisted,
          config: analysis.config,
          onLog: (msg) => setEnrichLogs((prev) => [...prev, msg]),
        });
        setEnriching(false);
        onAnalysisComplete({ ...analysis, enrichments });
      } catch (enrichErr) {
        setError(enrichErr instanceof Error ? enrichErr.message : "Enrichment failed.");
        setEnriching(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setAnalyzing(false);
      setEnriching(false);
    }
  };

  const loadUrnsFromServer = async () => {
    setError(null);
    try {
      const res = await fetch("/api/feed-urns");
      const data = await res.json().catch(() => ({}));
      const urns = Array.isArray(data.urns) ? data.urns : [];
      if (urns.length) {
        setUrnsJson(JSON.stringify(urns, null, 2));
      } else {
        setError("No .feed-urns.json found. Run: npx tsx scripts/capture-feed-urns.ts");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load URNs");
    }
  };

  const fetchPostsFromLinkedInApi = async (urnsToUse?: { urn: string; url: string }[]) => {
    setError(null);
    let urns: { urn: string; url: string }[] = [];
    if (urnsToUse) {
      urns = urnsToUse;
    } else {
      const raw = urnsJson.trim() || undefined;
      if (!raw) {
        setError("Load URNs first or paste URNs JSON above.");
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        urns = Array.isArray(parsed) ? parsed : parsed.urns ?? [];
      } catch {
        setError("Invalid URNs JSON.");
        return;
      }
    }
    if (!urns.length) {
      setError("URNs array is empty.");
      return;
    }
    setFetchingFromApi(true);
    try {
      const res = await fetch("/api/linkedin/fetch-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urns }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || res.statusText || "LinkedIn API request failed");
      }
      if (data.success && Array.isArray(data.posts)) {
        onFeedJsonChange(JSON.stringify(data.posts, null, 2));
        if (data.skipped) {
          setError(`Fetched ${data.posts.length} posts; ${data.skipped} skipped.`);
        }
      } else {
        throw new Error("No posts returned");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch from LinkedIn API failed");
    } finally {
      setFetchingFromApi(false);
    }
  };

  const runHybridFlow = async () => {
    setError(null);
    setHybridStatus("Capturing URNs...");
    setCapturing(true);
    try {
      const maxPosts = config?.maxPosts ?? 100;
      const captureRes = await fetch("/api/capture-urns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPosts }),
      });
      const captureData = await captureRes.json().catch(() => ({}));
      if (!captureRes.ok) {
        throw new Error(captureData.message || captureRes.statusText || "URN capture failed");
      }
      if (!captureData.success || !Array.isArray(captureData.urns) || !captureData.urns.length) {
        throw new Error("No URNs captured. Check browser and login.");
      }
      setCapturing(false);
      setHybridStatus(`Fetched ${captureData.urns.length} URNs. Calling API...`);
      setUrnsJson(JSON.stringify(captureData.urns, null, 2));
      await fetchPostsFromLinkedInApi(captureData.urns);
      setHybridStatus("Done.");
      setTimeout(() => setHybridStatus(null), 2000);
    } catch (e) {
      setCapturing(false);
      setHybridStatus(null);
      setError(e instanceof Error ? e.message : "Hybrid flow failed");
    }
  };

  const loadLastCapture = async () => {
    setError(null);
    setLoadingLast(true);
    try {
      const res = await fetch("/api/feed-import");
      const data = await res.json().catch(() => ({}));
      const posts = Array.isArray(data.posts) ? data.posts : [];
      if (posts.length) {
        onFeedJsonChange(JSON.stringify(posts, null, 2));
      } else {
        setError("No capture found. Use the browser extension on LinkedIn feed first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoadingLast(false);
    }
  };

  const startCapture = async () => {
    setError(null);
    setCapturing(true);
    try {
      const maxPosts = config?.maxPosts ?? 100;
      const res = await fetch("/api/capture-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPosts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || res.statusText || "Capture failed");
      }
      if (data.success && Array.isArray(data.posts)) {
        onFeedJsonChange(JSON.stringify(data.posts, null, 2));
      } else {
        throw new Error("No posts returned");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
    } finally {
      setCapturing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onFeedJsonChange(String(reader.result));
      setError(null);
    };
    reader.readAsText(file);
  };

  const hasFeed = feedJson.trim().length > 0;
  const busy = analyzing || enriching || capturing || loadingLast || fetchingFromApi;

  return (
    <div className="space-y-6">
      {/* Get feed */}
      <section className="rounded-[var(--radius)] border border-gray-200 bg-white p-6 shadow-[var(--shadow)] sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">Get feed</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Load your last capture from the extension, or paste/upload JSON.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadLastCapture}
            disabled={loadingLast}
            className="rounded-[var(--radius-sm)] bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow)] hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {loadingLast ? "Loading…" : "Load last capture"}
          </button>
          <button
            type="button"
            onClick={startCapture}
            disabled={capturing}
            className="rounded-[var(--radius-sm)] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {capturing ? "Capturing…" : "Playwright capture"}
          </button>
          <label className="cursor-pointer rounded-[var(--radius-sm)] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            Upload JSON
          </label>
          <a href="/sample-feed.json" download className="text-sm text-[var(--linkedin-blue)] hover:underline">
            Sample structure
          </a>
        </div>
      </section>

      {/* Feed JSON */}
      <section className="rounded-[var(--radius)] border border-gray-200 bg-white p-6 shadow-[var(--shadow)] sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">Feed data</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Paste or edit the feed JSON below. {hasFeed && `${(feedJson.match(/"id"/g) || []).length} posts detected.`}
        </p>
        <textarea
          rows={10}
          value={feedJson}
          onChange={(e) => {
            onFeedJsonChange(e.target.value);
            setError(null);
          }}
          placeholder='[{"id":"...","authorName":"...","content":"...", ...}]'
          className="mt-3 block w-full rounded-[var(--radius-sm)] border border-gray-300 bg-gray-50/50 px-3 py-2.5 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--linkedin-blue)] focus:bg-white focus:ring-1 focus:ring-[var(--linkedin-blue)]"
        />
      </section>

      {/* Run analysis */}
      <section className="rounded-[var(--radius)] border border-gray-200 bg-white p-6 shadow-[var(--shadow)] sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">Run analysis</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Shortlist by rules only, or shortlist and add AI suggestions in one go.
        </p>
        <details className="mt-3 text-sm text-[var(--text-muted)]">
          <summary className="cursor-pointer font-medium text-gray-700">Why might I get 0 shortlists?</summary>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-1">
            <li><strong>Hashtag match</strong> — Add hashtags in Config (e.g. leadership, AI). Posts with those hashtags or with content containing them will shortlist.</li>
            <li><strong>Watchlist</strong> — Add author names or profile URLs in Config; their posts will shortlist.</li>
            <li><strong>Mentions me</strong> — Set your LinkedIn username in Config; posts or comments mentioning you will shortlist.</li>
            <li><strong>High engagement</strong> — Requires min followers, reactions, and comments. Lower those in Config if your capture has small counts.</li>
          </ul>
          <p className="mt-2">The extension reads the full DOM (not just the visible excerpt) and tries to expand &quot;See more&quot; to capture full post text. It also captures author followers and reaction/comment counts when present.</p>
        </details>
        {enriching && enrichLogs.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-gray-200 bg-gray-900 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">AI logs</p>
            <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-300">
              {enrichLogs.join("\n")}
            </pre>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-[var(--radius-sm)] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={runShortlistOnly}
            disabled={!config || !hasFeed || busy}
            className="rounded-[var(--radius-sm)] border-2 border-[var(--linkedin-blue)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--linkedin-blue)] hover:bg-[var(--linkedin-blue)]/5 disabled:opacity-50 transition-colors"
          >
            {analyzing ? "Shortlisting…" : "Shortlist only"}
          </button>
          <button
            type="button"
            onClick={runShortlistAndEnrich}
            disabled={!config || !hasFeed || busy}
            className="rounded-[var(--radius-sm)] bg-[var(--linkedin-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow)] hover:bg-[var(--linkedin-dark)] disabled:opacity-50 transition-colors"
          >
            {analyzing ? "Shortlisting…" : enriching ? "Enriching…" : "Shortlist + AI"}
          </button>
        </div>
      </section>

      {/* Advanced: Hybrid / URNs */}
      <section className="rounded-[var(--radius)] border border-gray-200 bg-gray-50/80">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80 transition-colors"
        >
          <span>Advanced: URNs & LinkedIn API</span>
          <span className="text-gray-400">{advancedOpen ? "▼" : "▶"}</span>
        </button>
        {advancedOpen && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Capture URNs via Playwright, then fetch post details via LinkedIn API. Requires <code className="rounded bg-gray-200 px-1">LINKEDIN_ACCESS_TOKEN</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runHybridFlow}
                disabled={capturing || fetchingFromApi || !!hybridStatus}
                className="rounded-[var(--radius-sm)] bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {hybridStatus || (capturing || fetchingFromApi ? "Running…" : "Hybrid: URNs + API")}
              </button>
              <button type="button" onClick={loadUrnsFromServer} className="rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Load URNs from file
              </button>
              <button
                type="button"
                onClick={() => fetchPostsFromLinkedInApi()}
                disabled={fetchingFromApi}
                className="rounded-[var(--radius-sm)] border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {fetchingFromApi ? "Fetching…" : "Fetch posts from API"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                placeholder="Paste post URL (Copy link to post)"
                value={postUrlInput}
                onChange={(e) => setPostUrlInput(e.target.value)}
                className="min-w-[200px] rounded-[var(--radius-sm)] border border-gray-300 px-2.5 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const urn = getUrnFromPostUrl(postUrlInput);
                  if (!urn) {
                    setError("Invalid post URL.");
                    return;
                  }
                  setError(null);
                  const url = getPostUrlFromUrn(urn);
                  let list: { urn: string; url: string }[] = [];
                  try {
                    if (urnsJson.trim()) {
                      const parsed = JSON.parse(urnsJson);
                      list = Array.isArray(parsed) ? parsed : parsed.urns ?? [];
                    }
                  } catch {
                    list = [];
                  }
                  if (!list.some((e) => e.urn === urn)) {
                    list.push({ urn, url });
                    setUrnsJson(JSON.stringify(list, null, 2));
                  }
                  setPostUrlInput("");
                }}
                className="rounded-[var(--radius-sm)] border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Add URL
              </button>
            </div>
            <textarea
              placeholder='URNs JSON: [{"urn":"...","url":"..."}]'
              value={urnsJson}
              onChange={(e) => setUrnsJson(e.target.value)}
              className="block w-full rounded-[var(--radius-sm)] border border-gray-300 bg-white px-2.5 py-2 font-mono text-xs"
              rows={3}
            />
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
