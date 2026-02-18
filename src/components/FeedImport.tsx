"use client";

import { useState, useCallback } from "react";
import type { LinkedInPost } from "@/types";
import { Upload, FileJson } from "lucide-react";

interface FeedImportProps {
  onImport: (posts: LinkedInPost[]) => void;
  currentCount?: number;
}

export function FeedImport({ onImport, currentCount = 0 }: FeedImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = useCallback(
    (content: string): LinkedInPost[] => {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : data.posts ?? data.feed ?? [];
      return arr.map((p: Record<string, unknown>, i: number) => ({
        id: String((p.id as string) ?? `import-${i}`),
        url: String(p.url ?? ""),
        authorName: String(p.authorName ?? p.author ?? "Unknown"),
        authorProfileUrl: p.authorProfileUrl
          ? String(p.authorProfileUrl)
          : undefined,
        authorFollowers: Number(p.authorFollowers ?? p.followers ?? 0),
        content: String(p.content ?? p.text ?? ""),
        reactions: Number(p.reactions ?? p.likes ?? 0),
        comments: Number(p.comments ?? 0),
        reposts: p.reposts ? Number(p.reposts) : undefined,
        postedAt: String(p.postedAt ?? p.date ?? new Date().toISOString()),
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        commentsPreview: Array.isArray(p.commentsPreview)
          ? p.commentsPreview
          : undefined,
      }));
    },
    []
  );

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const posts = parseFile(reader.result as string);
        if (posts.length === 0) {
          setError("No valid posts found in file");
          return;
        }
        onImport(posts);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Invalid JSON format"
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file?.name.endsWith(".json")) handleFile(file);
          else setError("Please upload a JSON file");
        }}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-colors
          ${dragOver ? "border-linkedin-blue bg-linkedin-blue/10" : "border-slate-600 hover:border-slate-500"}
        `}
      >
        <FileJson className="w-12 h-12 mx-auto text-slate-400 mb-2" />
        <p className="text-slate-300 text-sm mb-2">
          Drag & drop a JSON file with feed data, or
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer text-sm font-medium">
          <Upload className="w-4 h-4" />
          Choose file
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        {currentCount > 0 && (
          <p className="text-slate-400 text-sm mt-2">
            {currentCount} posts loaded
          </p>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
