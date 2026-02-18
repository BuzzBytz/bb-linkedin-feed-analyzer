import type { ShortlistedPost, AnalysisConfig, PostEnrichment } from "./types";

/**
 * Call the enrich API with streaming; invokes onLog for each server log line and returns enrichments when done.
 */
export async function enrichWithStream(options: {
  shortlisted: ShortlistedPost[];
  config: AnalysisConfig;
  onLog: (message: string) => void;
}): Promise<PostEnrichment[]> {
  const { shortlisted, config, onLog } = options;
  const res = await fetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shortlisted, config, stream: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let enrichments: PostEnrichment[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === "log" && typeof obj.message === "string") {
          onLog(obj.message);
        } else if (obj.type === "done" && Array.isArray(obj.enrichments)) {
          enrichments = obj.enrichments;
        }
      } catch {
        // ignore parse errors for non-JSON lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer.trim());
      if (obj.type === "done" && Array.isArray(obj.enrichments)) enrichments = obj.enrichments;
    } catch {
      //
    }
  }
  return enrichments;
}
