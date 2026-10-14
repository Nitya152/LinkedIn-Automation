"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ConfigForm, { DEFAULT_CONFIG } from "@/components/ConfigForm";
import EndpointsDrawer from "@/components/EndpointsDrawer";
import ExecutionLog from "@/components/ExecutionLog";
import ProfileCard from "@/components/ProfileCard";
import PostsFeed from "@/components/PostsFeed";
import ResultsSummary from "@/components/ResultsSummary";
import BatchRunner from "@/components/BatchRunner";
import { AutomationConfig, AutomationResponse, AutomationStepLog, PostItem, ProfileInfo } from "@/types";
import { AlertCircle, ShieldCheck, Zap, User, Users, Clock } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [config, setConfig] = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AutomationStepLog[]>([]);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [executionStats, setExecutionStats] = useState<{
    durationMs: number;
    completedAt: string;
    success: boolean;
  } | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    async function loadConfig() {
      let merged = { ...DEFAULT_CONFIG };
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            merged = { ...merged, ...data.config };
          }
        }
      } catch (e) {
        console.warn("Could not load config from DB:", e);
      }
      try {
        const saved = localStorage.getItem("linkedin_automation_config_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          merged = { ...merged, ...parsed };
        }
      } catch (e) {
        console.warn("Could not load config from localStorage:", e);
      }
      setConfig(merged);
    }
    loadConfig();
  }, []);

  const handleRunAutomation = async (activeConfig: AutomationConfig) => {
    setConfig(activeConfig);
    setIsRunning(true);
    setAutomationError(null);

    setLogs([
      {
        step: 1,
        title: "Resolve Public Slug to provider_id",
        method: "GET",
        endpoint: `/users/${activeConfig.targetInput}?account_id=${activeConfig.accountId}`,
        url: `${activeConfig.baseUrl}/users/...`,
        status: "running",
        summary: `Dispatching profile lookup for "${activeConfig.targetInput}"...`,
        timestamp: new Date().toISOString(),
      },
    ]);

    const startTime = performance.now();

    try {
      const response = await fetch("/api/automate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activeConfig),
      });

      const data: AutomationResponse = await response.json();
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      setLogs(data.logs || []);
      setProfile(data.profile || null);
      setPosts(data.posts || []);

      const isOverallSuccess = data.success !== false;
      setExecutionStats({
        durationMs,
        completedAt: new Date().toLocaleTimeString(),
        success: isOverallSuccess,
      });

      if (!data.success && data.error) {
        setAutomationError(data.error);
      }
    } catch (err: any) {
      const endTime = performance.now();
      setAutomationError(err.message || "Failed to execute automation flow");
      setLogs((prev) => [
        ...prev,
        {
          step: 99,
          title: "Network / Transport Error",
          method: "CLIENT",
          endpoint: "/api/automate",
          url: "/api/automate",
          status: "error",
          summary: `Failed to communicate with automation backend route: ${err.message}`,
          timestamp: new Date().toISOString(),
          error: err.message,
        },
      ]);
      setExecutionStats({
        durationMs: Math.round(endTime - startTime),
        completedAt: new Date().toLocaleTimeString(),
        success: false,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const latestPost = posts.length > 0 ? posts[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-200/70 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "single"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Single Profile Flow</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "batch"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Batch Queue (10–15 Slugs & Random Gaps)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Humanized Random Interval Rate-Limiting Active</span>
          </div>
        </div>

        {/* BATCH RUNNER TAB */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            <section>
              <BatchRunner
                baseConfig={config}
                onSwitchToSingleTab={() => setActiveTab("single")}
              />
            </section>

            {/* Collapsible Endpoints Specs */}
            <section>
              <EndpointsDrawer />
            </section>
          </div>
        )}

        {/* SINGLE PROFILE TAB */}
        {activeTab === "single" && (
          <div className="space-y-6">
            {automationError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3 shadow-xs">
                <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-rose-900">Execution Notice</h4>
                  <p className="text-xs text-rose-700 leading-relaxed">{automationError}</p>
                </div>
              </div>
            )}

            <section>
              <ConfigForm
                onRunAutomation={handleRunAutomation}
                isRunning={isRunning}
                initialConfig={config}
                onConfigChange={(newCfg) => setConfig(newCfg)}
              />
            </section>

            <section>
              <EndpointsDrawer />
            </section>

            {/* DEDICATED RESULTS SECTION */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span>Results & Engagement Outcomes</span>
                </h2>
                <span className="text-[11px] text-slate-500">Aggregated flow overview</span>
              </div>

              <ResultsSummary
                results={{
                  isRunning,
                  logs,
                  profile,
                  posts,
                  latestPost,
                  stats: executionStats,
                  error: automationError,
                }}
              />
            </section>

            {/* Detailed Execution Logs & Profile Card */}
            <section className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7">
                  <ExecutionLog logs={logs} isRunning={isRunning} />
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <ProfileCard profile={profile} />

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      Engine Safeguards
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                          <strong className="text-slate-800">Isolated Provider ID:</strong> Vanity slug is exclusively resolved in Step 1. All subsequent actions strictly utilize <code className="text-blue-600 font-mono">provider_id</code>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>
                          <strong className="text-slate-800">Connection Intelligence:</strong> Existing 1st-degree connections and pending invitations are skipped automatically.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>
                          <strong className="text-slate-800">Deterministic Order:</strong> Posts are sorted deterministically using ISO <code className="text-amber-700 font-mono">parsed_datetime</code> descending.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <section className="pt-2">
                <PostsFeed posts={posts} config={config} />
              </section>
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 mt-10 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>LinkedIn Manager Engagement Flow • Batch Queue with Randomized Intervals • Unipile Engine</p>
          <p className="font-mono text-[11px] text-slate-400">
            Next.js App Router • Audit Log Exporter (CSV/JSON)
          </p>
        </div>
      </footer>
    </div>
  );
}
