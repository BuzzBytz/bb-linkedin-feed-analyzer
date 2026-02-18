"use client";

import { useState, useEffect } from "react";
import type { AnalysisConfig } from "@/types";
import { loadConfig, saveConfig, DEFAULT_CONFIG } from "@/lib/config";
import { Settings, Save } from "lucide-react";

export function ConfigPanel({
  onConfigChange,
  isOpen,
  onClose,
}: {
  onConfigChange: (config: AnalysisConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<AnalysisConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const handleSave = () => {
    saveConfig(config);
    onConfigChange(config);
    onClose();
  };

  const update = <K extends keyof AnalysisConfig>(
    key: K,
    value: AnalysisConfig[K]
  ) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Analysis Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Max posts to analyze
            </label>
            <input
              type="number"
              value={config.maxPostsToAnalyze}
              onChange={(e) =>
                update("maxPostsToAnalyze", parseInt(e.target.value) || 500)
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
              min={10}
              max={1000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Shortlist size
            </label>
            <input
              type="number"
              value={config.shortlistSize}
              onChange={(e) =>
                update("shortlistSize", parseInt(e.target.value) || 50)
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
              min={5}
              max={100}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Min followers
              </label>
              <input
                type="number"
                value={config.minFollowers}
                onChange={(e) =>
                  update("minFollowers", parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Min reactions
              </label>
              <input
                type="number"
                value={config.minReactions}
                onChange={(e) =>
                  update("minReactions", parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Min comments
              </label>
              <input
                type="number"
                value={config.minComments}
                onChange={(e) =>
                  update("minComments", parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Mention keyword (your name for &quot;mentions me&quot;)
            </label>
            <input
              type="text"
              value={config.mentionKeyword}
              onChange={(e) => update("mentionKeyword", e.target.value)}
              placeholder="e.g. John"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Watchlist (comma-separated names or profile URLs)
            </label>
            <textarea
              value={config.watchlist.join(", ")}
              onChange={(e) =>
                update(
                  "watchlist",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Satya Nadella, /in/sarahchen"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white min-h-[80px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Hashtags (comma-separated)
            </label>
            <input
              type="text"
              value={config.hashtags.join(", ")}
              onChange={(e) =>
                update(
                  "hashtags",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="AI, Leadership, Startup"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-linkedin-blue hover:bg-linkedin-dark rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
