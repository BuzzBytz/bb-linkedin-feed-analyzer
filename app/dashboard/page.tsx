"use client";

import { useState } from "react";
import { ConfigForm } from "./components/ConfigForm";
import { FeedImport } from "./components/FeedImport";
import { AnalysisResults } from "./components/AnalysisResults";
import type { AnalysisConfig } from "@/lib/types";
import type { AnalysisResult } from "@/lib/types";
import { enrichWithStream } from "@/lib/enrich-client";

const STEPS = [
  { id: "config", label: "Rules", short: "1" },
  { id: "import", label: "Import & analyze", short: "2" },
  { id: "results", label: "Results", short: "3" },
] as const;

export default function DashboardPage() {
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [feedJson, setFeedJson] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<"config" | "import" | "results">("config");
  const [enrichingFromResults, setEnrichingFromResults] = useState(false);
  const [enrichLogs, setEnrichLogs] = useState<string[]>([]);

  const onConfigSave = (c: AnalysisConfig) => {
    setConfig(c);
    setStep("import");
  };

  const onAnalysisComplete = (r: AnalysisResult) => {
    setResult(r);
    setStep("results");
  };

  const onEnrichRequest = async () => {
    if (!result || result.shortlisted.length === 0) return;
    setEnrichingFromResults(true);
    setEnrichLogs([]);
    try {
      const enrichments = await enrichWithStream({
        shortlisted: result.shortlisted,
        config: result.config,
        onLog: (msg) => setEnrichLogs((prev) => [...prev, msg]),
      });
      setResult({ ...result, enrichments });
    } catch (e) {
      console.error(e);
    } finally {
      setEnrichingFromResults(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav aria-label="Progress" className="flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isPast = i < currentStepIndex;
          const isDisabled = s.id === "results" && !result;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => !isDisabled && setStep(s.id)}
              disabled={isDisabled}
              aria-current={isActive ? "step" : undefined}
              className={`
                flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all
                sm:h-11 sm:w-11
                ${isActive ? "bg-[var(--linkedin-blue)] text-white shadow-md" : ""}
                ${isPast ? "bg-[var(--linkedin-blue)]/90 text-white" : ""}
                ${!isActive && !isPast && !isDisabled ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : ""}
                ${isDisabled ? "cursor-not-allowed bg-gray-100 text-gray-400" : ""}
              `}
              title={s.label}
            >
              {s.short}
            </button>
          );
        })}
        <div className="ml-2 hidden text-left sm:block">
          <p className="text-sm font-medium text-gray-900">{STEPS[currentStepIndex].label}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {step === "config" && "Set shortlist rules"}
            {step === "import" && "Load feed and run analysis"}
            {step === "results" && (result ? "Review and engage" : "Run analysis first")}
          </p>
        </div>
      </nav>

      {step === "config" && (
        <ConfigForm
          initialConfig={config}
          onSave={onConfigSave}
          onNext={() => setStep("import")}
        />
      )}

      {step === "import" && (
        <FeedImport
          config={config}
          feedJson={feedJson}
          onFeedJsonChange={setFeedJson}
          onAnalysisComplete={onAnalysisComplete}
          onBack={() => setStep("config")}
        />
      )}

      {step === "results" && result && (
        <AnalysisResults
          result={result}
          onBack={() => setStep("import")}
          onEnrichRequest={result.shortlisted.length > 0 ? onEnrichRequest : undefined}
          enriching={enrichingFromResults}
          enrichLogs={enrichLogs}
        />
      )}
    </div>
  );
}
