"use client";

import { useState, useEffect } from "react";
import { Play, Settings, Loader2 } from "lucide-react";
import type {
  AnalysisConfig,
  LinkedInPost,
  ShortlistMatch,
  PostAnalysis,
} from "@/types";
import { loadConfig } from "@/lib/config";
import { SAMPLE_FEED } from "@/lib/sample-data";
import { ConfigPanel } from "@/components/ConfigPanel";
import { FeedImport } from "@/components/FeedImport";
import { PostCard } from "@/components/PostCard";

export default function Dashboard() {
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [analysis, setAnalysis] = useState<{
    shortlist: ShortlistMatch[];
    totalAnalyzed: number;
    enhanced: PostAnalysis[] | null;
    loading: boolean;
    enhancing: boolean;
  }>({ shortlist: [], totalAnalyzed: 0, enhanced: null, loading: false, enhancing: false });

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const runAnalysis = async () => {
    const feed = posts.length > 0 ? posts : SAMPLE_FEED;
    const cfg = config ?? loadConfig();

    setAnalysis((a) => ({ ...a, loading: true }));

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: feed, config: cfg }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setAnalysis((a) => ({
        ...a,
        shortlist: data.shortlist,
        totalAnalyzed: data.totalAnalyzed,
        loading: false,
      }));

      // Auto-run AI enhancement
      if (data.shortlist.length > 0) {
        setAnalysis((a) => ({ ...a, enhancing: true }));
        const enhanceRes = await fetch("/api/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shortlist: data.shortlist }),
        });
        if (enhanceRes.ok) {
          const enhanceData = await enhanceRes.json();
          setAnalysis((a) => ({
            ...a,
            enhanced: enhanceData.posts,
            enhancing: false,
          }));
        } else {
          setAnalysis((a) => ({ ...a, enhancing: false }));
        }
      }
    } catch (err) {
      setAnalysis((a) => ({
        ...a,
        loading: false,
        enhancing: false,
      }));
      console.error(err);
    }
  };

  const displayPosts = analysis.enhanced ?? analysis.shortlist.map((m) => ({
    post: m.post,
    matchReasons: m.reasons,
    matchSummary: m.matchedCriteria.join(". "),
    suggestedReaction: "Like" as const,
    repostComment: `Thanks for sharing, ${m.post.authorName}!`,
    replyComment: "Really appreciate this perspective.",
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            LinkedIn Engagement Assistant
          </h1>
          <button
            onClick={() => setConfigOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Feed source</h2>
          <FeedImport
            onImport={setPosts}
            currentCount={posts.length}
          />
          <p className="text-slate-500 text-sm mt-2">
            Import JSON feed data, or use sample data when you click Start.
          </p>
        </section>

        <section className="mb-8">
          <button
            onClick={runAnalysis}
            disabled={analysis.loading}
            className="flex items-center gap-2 px-6 py-3 bg-linkedin-blue hover:bg-linkedin-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
          >
            {analysis.loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {analysis.loading ? "Analyzing..." : "START Analysis"}
          </button>
          {analysis.enhancing && (
            <p className="text-slate-400 text-sm mt-2">
              Generating AI summaries and comments...
            </p>
          )}
        </section>

        {analysis.totalAnalyzed > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Results ({analysis.shortlist.length} shortlisted from{" "}
              {analysis.totalAnalyzed} analyzed)
            </h2>
            <div className="space-y-4">
              {displayPosts.map((item) => (
                <PostCard key={item.post.id} analysis={item} />
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-6">
              MVP: Copy comments and apply reactions manually on LinkedIn to
              avoid bot detection.
            </p>
          </section>
        )}
      </main>

      <ConfigPanel
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        onConfigChange={setConfig}
      />
    </div>
  );
}
