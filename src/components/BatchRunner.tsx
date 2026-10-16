"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  Timer,
  FileSpreadsheet,
  FileJson,
  Layers,
  RefreshCw,
  ShieldCheck,
  History,
  Trash2,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { AutomationConfig } from "@/types";
import { extractLinkedInSlug } from "@/lib/unipile";
import JsonViewer from "./JsonViewer";

interface BatchRunnerProps {
  baseConfig: AutomationConfig;
  onSwitchToSingleTab?: () => void;
}

const DEFAULT_SAMPLE_SLUGS = [
  "vaidehi-gondalia-35b395250",
  "satyanadella",
  "williamhgates",
  "sundarpichai",
  "jeffweiner08",
  "shantanu-narayen",
  "arvind-krishna",
  "marc-benioff",
  "tim-cook",
  "reidhoffman",
  "jensen-huang",
  "sam-altman",
];

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

export default function BatchRunner({ baseConfig, onSwitchToSingleTab }: BatchRunnerProps) {
  const [effectiveConfig, setEffectiveConfig] = useState<AutomationConfig>(baseConfig);
  const [commonComment, setCommonComment] = useState(baseConfig.commentText || "");
  const [batchReactionType, setBatchReactionType] = useState<
    "like" | "celebrate" | "support" | "love" | "insightful" | "funny" | "none"
  >(baseConfig.reactionType || "like");

  const [slugsText, setSlugsText] = useState("");
  const [minDelayMinutes, setMinDelayMinutes] = useState(2);
  const [maxDelayMinutes, setMaxDelayMinutes] = useState(5);

  // Sync with baseConfig or load fallback from DB/localStorage if apiKey is missing
  useEffect(() => {
    if (baseConfig.apiKey) {
      setEffectiveConfig(baseConfig);
      if (baseConfig.commentText && !commonComment) {
        setCommonComment(baseConfig.commentText);
      }
      if (baseConfig.reactionType) {
        setBatchReactionType(baseConfig.reactionType);
      }
      return;
    }

    async function loadFallbackConfig() {
      // 1. Try DB config
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.config && data.config.apiKey) {
            setEffectiveConfig(data.config);
            if (data.config.commentText) setCommonComment(data.config.commentText);
            if (data.config.reactionType) setBatchReactionType(data.config.reactionType);
            return;
          }
        }
      } catch (e) {
        console.warn("Could not load config from DB in BatchRunner:", e);
      }

      // 2. Try localStorage
      try {
        const saved = localStorage.getItem("linkedin_automation_config_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.apiKey) {
            setEffectiveConfig(parsed);
            if (parsed.commentText) setCommonComment(parsed.commentText);
            if (parsed.reactionType) setBatchReactionType(parsed.reactionType);
          }
        }
      } catch (e) {
        console.warn("Could not load config from localStorage in BatchRunner:", e);
      }
    }

    loadFallbackConfig();
  }, [baseConfig]);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any | null>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [pastJobs, setPastJobs] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const parsedSlugs = slugsText
    .split(/[\n,]+/)
    .map((s) => extractLinkedInSlug(s))
    .filter(Boolean);

  // Load last active job ID or fetch history on mount
  useEffect(() => {
    fetchPastJobs();
    const savedJobId = localStorage.getItem("linkedin_active_job_id");
    if (savedJobId) {
      setActiveJobId(savedJobId);
    }
  }, []);

  // Fetch list of past jobs from DB
  const fetchPastJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.jobs) {
        setPastJobs(data.jobs);
        // If there's an active RUNNING job in DB and we don't have one selected, select it!
        const runningJob = data.jobs.find((j: any) => j.status === "RUNNING");
        if (runningJob && !activeJobId) {
          setActiveJobId(runningJob.id);
          localStorage.setItem("linkedin_active_job_id", runningJob.id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch past jobs:", err);
    }
  };

  // Poll active job details
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    const fetchJobDetails = async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
        if (!res.ok) {
          if (res.status === 404) {
            localStorage.removeItem("linkedin_active_job_id");
            setActiveJobId(null);
          }
          return;
        }
        const data = await res.json();
        if (isMounted) {
          setJobData(data.job);
          setJobItems(data.items || []);

          // Calculate remaining seconds if nextRunAt is set
          if (data.job?.nextRunAt && data.job.status === "RUNNING") {
            const diffSec = Math.max(
              0,
              Math.ceil((new Date(data.job.nextRunAt).getTime() - Date.now()) / 1000)
            );
            setRemainingSeconds(diffSec);
          } else {
            setRemainingSeconds(null);
          }
        }
      } catch (err) {
        console.warn("Error polling job details:", err);
      }
    };

    fetchJobDetails();
    const interval = setInterval(fetchJobDetails, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeJobId]);

  // Local second countdown ticker
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev && prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // Start new background batch job
  const handleStartBatch = async () => {
    if (parsedSlugs.length === 0) {
      alert("Please provide at least one valid LinkedIn slug or URL.");
      return;
    }

    if (!effectiveConfig.apiKey || !effectiveConfig.accountId) {
      alert("API Key and Account ID are required to run a batch. Please configure and save them in the Single Profile Flow tab.");
      onSwitchToSingleTab?.();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: effectiveConfig.baseUrl,
          apiKey: effectiveConfig.apiKey,
          accountId: effectiveConfig.accountId,
          slugs: parsedSlugs,
          minDelayMinutes,
          maxDelayMinutes,
          reactionType: batchReactionType,
          commentText: commonComment.trim() || undefined,
          sendWithoutNote: effectiveConfig.sendWithoutNote ?? true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start batch job");
      }

      setActiveJobId(data.jobId);
      localStorage.setItem("linkedin_active_job_id", data.jobId);
      fetchPastJobs();
    } catch (err: any) {
      alert(`Error starting batch: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!activeJobId) return;
    try {
      await fetch(`/api/jobs/${activeJobId}/pause`, { method: "POST" });
      setJobData((prev: any) => (prev ? { ...prev, status: "PAUSED" } : prev));
      fetchPastJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async () => {
    if (!activeJobId) return;
    try {
      await fetch(`/api/jobs/${activeJobId}/resume`, { method: "POST" });
      setJobData((prev: any) => (prev ? { ...prev, status: "RUNNING" } : prev));
      fetchPastJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async () => {
    if (!activeJobId) return;
    if (!confirm("Are you sure you want to stop this batch job?")) return;
    try {
      await fetch(`/api/jobs/${activeJobId}/cancel`, { method: "POST" });
      setJobData((prev: any) => (prev ? { ...prev, status: "CANCELLED" } : prev));
      setRemainingSeconds(null);
      fetchPastJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this batch audit history from the database?")) return;
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (activeJobId === id) {
        setActiveJobId(null);
        setJobData(null);
        setJobItems([]);
        localStorage.removeItem("linkedin_active_job_id");
      }
      fetchPastJobs();
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (jobItems.length === 0) return;

    const headers = [
      "#",
      "Account ID",
      "Target Slug",
      "Resolved Name",
      "Provider ID",
      "Status",
      "Gap Before (Minutes)",
      "Started At",
      "Completed At",
      "Duration (ms)",
      "Connection Action",
      "Reaction Action",
      "Comment Action",
      "Error Details",
    ];

    const rows = jobItems.map((r, idx) => [
      idx + 1,
      `"${jobData?.accountId || effectiveConfig.accountId}"`,
      `"${r.slug}"`,
      `"${r.name || "N/A"}"`,
      `"${r.provider_id || "N/A"}"`,
      r.status,
      r.delay_before_minutes?.toFixed(2) || 0,
      `"${r.started_at || ""}"`,
      `"${r.completed_at || ""}"`,
      r.duration_ms || 0,
      `"${(r.connection_outcome || "").replace(/"/g, '""')}"`,
      `"${(r.reaction_outcome || "").replace(/"/g, '""')}"`,
      `"${(r.comment_outcome || "").replace(/"/g, '""')}"`,
      `"${(r.error || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `linkedin-audit-${jobData?.id || "batch"}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export
  const handleExportJSON = () => {
    if (jobItems.length === 0) return;
    const payload = { job: jobData, items: jobItems };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `linkedin-audit-${jobData?.id || "batch"}-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isJobRunning = jobData?.status === "RUNNING";
  const isJobPaused = jobData?.status === "PAUSED";
  const completedCount = jobData?.completedProfiles || 0;
  const totalCount = jobData?.totalProfiles || parsedSlugs.length || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Top Banner: Database Persistence & Safe to Close Window */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-emerald-900">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">Persistent SQLite Database Worker Active</span>
            <span className="text-emerald-700 block sm:inline sm:ml-1.5">
              • All jobs run on the server background worker. <strong>You can safely close this browser tab</strong> and everything continues running.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors shadow-2xs cursor-pointer"
        >
          <History className="h-3.5 w-3.5" />
          <span>{showHistory ? "Hide Past Batches" : `Past Batches (${pastJobs.length})`}</span>
        </button>
      </div>

      {/* Credential Status & Sync Banner */}
      <div
        className={`rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
          effectiveConfig.apiKey && effectiveConfig.accountId
            ? "border-blue-200 bg-blue-50/60 text-blue-900"
            : "border-amber-200 bg-amber-50/80 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <KeyRound
            className={`h-4.5 w-4.5 flex-shrink-0 ${
              effectiveConfig.apiKey && effectiveConfig.accountId
                ? "text-blue-600"
                : "text-amber-600"
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {effectiveConfig.apiKey && effectiveConfig.accountId
                  ? "Unipile Credentials Synced"
                  : "Unipile Credentials Missing"}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  effectiveConfig.apiKey && effectiveConfig.accountId
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-200/70 text-amber-900"
                }`}
              >
                {effectiveConfig.apiKey && effectiveConfig.accountId ? "Ready" : "Action Required"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {effectiveConfig.apiKey && effectiveConfig.accountId ? (
                <>
                  Active Account ID: <code className="font-mono font-semibold text-slate-800">{effectiveConfig.accountId}</code> • DSN:{" "}
                  <span className="font-mono">{effectiveConfig.baseUrl.replace(/^https?:\/\//, "")}</span>
                </>
              ) : (
                "Please configure and save your API Key and Account ID in the Single Profile Flow tab so batch automation can execute."
              )}
            </p>
          </div>
        </div>

        {(!effectiveConfig.apiKey || !effectiveConfig.accountId) && onSwitchToSingleTab && (
          <button
            type="button"
            onClick={onSwitchToSingleTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <span>Configure in Single Flow</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-4 w-4 text-blue-600" />
              <span>Stored Batches in SQLite Database</span>
            </h4>
            <span className="text-[11px] text-slate-500">Click any run to view its audit log</span>
          </div>

          {pastJobs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No previous jobs stored yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
              {pastJobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => {
                    setActiveJobId(j.id);
                    localStorage.setItem("linkedin_active_job_id", j.id);
                  }}
                  className={`p-2.5 rounded-md border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    activeJobId === j.id
                      ? "border-blue-400 bg-blue-50/80 ring-1 ring-blue-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 truncate font-mono text-[11px]">
                        {j.id.slice(0, 16)}...
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          j.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : j.status === "RUNNING"
                            ? "bg-blue-100 text-blue-800 animate-pulse"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {j.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {j.completed_profiles}/{j.total_profiles} profiles • {new Date(j.created_at).toLocaleTimeString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteJob(j.id, e)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Delete job from database"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Batch Profile Automation (Minute-Based Random Intervals)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Queue 10–15 profiles with randomized gaps between requests. Executes in the background on SQLite.
          </p>
        </div>

        {jobItems.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <FileJson className="h-3.5 w-3.5 text-blue-600" />
              <span>Export JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Input & Timing Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Slugs Input (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span>Target Profiles List (One slug or URL per line)</span>
              <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-1.5 py-0.2">
                {parsedSlugs.length} Detected
              </span>
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSlugsText(DEFAULT_SAMPLE_SLUGS.join("\n"))}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-medium cursor-pointer"
              >
                Load Sample 12 Slugs
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSlugsText(parsedSlugs.join("\n"))}
                className="text-slate-500 hover:text-slate-700 text-[11px] cursor-pointer"
              >
                Clean Slugs
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSlugsText("")}
                className="text-slate-500 hover:text-rose-600 text-[11px] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={slugsText}
            onChange={(e) => setSlugsText(e.target.value)}
            placeholder="vaidehi-gondalia-35b395250&#10;satyanadella&#10;williamhgates&#10;https://www.linkedin.com/in/sundarpichai"
            className="w-full rounded-lg border border-slate-300 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none font-mono leading-relaxed"
          />
        </div>

        {/* Timing in MINUTES & Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 uppercase tracking-wider">
              <Timer className="h-4 w-4 text-blue-600" />
              <span>Random Gap Timing (In Minutes)</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every request is spaced out by a random duration between <strong>Min</strong> and <strong>Max</strong> minutes to replicate realistic browsing intervals.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Min Gap (Minutes)
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  value={minDelayMinutes}
                  onChange={(e) =>
                    setMinDelayMinutes(Math.max(0.1, parseFloat(e.target.value) || 1))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  = {Math.round(minDelayMinutes * 60)}s
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Max Gap (Minutes)
                </label>
                <input
                  type="number"
                  min={minDelayMinutes}
                  max={120}
                  step={0.5}
                  value={maxDelayMinutes}
                  onChange={(e) =>
                    setMaxDelayMinutes(
                      Math.max(minDelayMinutes, parseFloat(e.target.value) || minDelayMinutes)
                    )
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  = {Math.round(maxDelayMinutes * 60)}s
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1.5 flex items-center justify-between">
              <span>Account:</span>
              <code className="font-mono font-semibold text-slate-800 truncate max-w-[160px]">
                {effectiveConfig.accountId || "Not Set"}
              </code>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            {!isJobRunning ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleStartBatch}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-white" />
                )}
                <span>Launch Background Batch ({parsedSlugs.length} Slugs)</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-white" />
                  <span>Stop</span>
                </button>
              </>
            )}

            {isJobPaused && (
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Common Batch Engagement Settings (Reaction & Common Auto-Comment) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wider">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span>Common Batch Engagement Actions (Steps 4 & 5)</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Applied to each profile's latest post during the batch queue
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reaction Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5 text-blue-600" />
              <span>Auto-Reaction (Step 4)</span>
            </label>
            <select
              value={batchReactionType}
              onChange={(e) =>
                setBatchReactionType(
                  e.target.value as "like" | "celebrate" | "support" | "love" | "insightful" | "funny" | "none"
                )
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none capitalize font-medium"
            >
              <option value="like">👍 Like</option>
              <option value="none">🚫 None (Fetch posts only, do not react)</option>
              <option value="celebrate">👏 Celebrate</option>
              <option value="support">🤝 Support</option>
              <option value="love">❤️ Love</option>
              <option value="insightful">💡 Insightful</option>
              <option value="funny">😄 Funny</option>
            </select>
            <p className="text-[10px] text-slate-400">
              {batchReactionType === "none" ? "Post reaction skipped; extracts feed & milestones only." : "Reacts to the most recent post found on each profile."}
            </p>
          </div>

          {/* Common Auto-Comment Text */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                <span>Common Auto-Comment (Step 5)</span>
              </label>
              <span className="text-[10px] text-slate-400">Optional • Leave empty to skip commenting</span>
            </div>
            <textarea
              rows={2}
              value={commonComment}
              onChange={(e) => setCommonComment(e.target.value)}
              placeholder="e.g. Great insights and great work! Thanks for sharing this."
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Live Minute Countdown Bar when waiting */}
      {remainingSeconds !== null && remainingSeconds > 0 && isJobRunning && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-xs font-semibold text-blue-900">
                Server-Side Interval Active: Waiting {formatTime(remainingSeconds)} before next profile execution
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Current random gap: <strong>{jobData?.currentGapMinutes || 0} minutes</strong>. Running automatically on server SQLite DB.
              </p>
            </div>
          </div>
          <span className="font-mono text-base font-bold text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-md shadow-2xs">
            {formatTime(remainingSeconds)}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      {jobData && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600">
            <span>
              Job <strong>{jobData.id}</strong>: {completedCount} of {totalCount} completed ({jobData.status})
            </span>
            <span className="font-mono font-medium">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                jobData.status === "COMPLETED"
                  ? "bg-emerald-500"
                  : jobData.status === "CANCELLED"
                  ? "bg-rose-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Detailed Batch Audit Log Table from DB */}
      {jobItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Persistent Audit Log ({jobItems.length} Profiles)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Account: {jobData?.accountId || effectiveConfig.accountId || "Not Set"}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Target Slug</th>
                  <th className="py-2.5 px-3">Resolved Profile</th>
                  <th className="py-2.5 px-3">Time Started</th>
                  <th className="py-2.5 px-3">Time Completed</th>
                  <th className="py-2.5 px-3">Random Gap</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {jobItems.map((item, idx) => {
                  const isExpanded = expandedRowId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.status === "RUNNING"
                          ? "bg-blue-50/40"
                          : item.status === "DELAYING"
                          ? "bg-amber-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        #{idx + 1}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {item.slug}
                      </td>

                      <td className="py-2.5 px-3">
                        {item.name || item.provider_id ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900 block truncate max-w-[140px]">
                              {item.name || item.slug}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[140px]">
                              {item.provider_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">
                        {item.started_at ? new Date(item.started_at).toLocaleTimeString() : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-600 whitespace-nowrap">
                        {item.completed_at ? (
                          <span>
                            {new Date(item.completed_at).toLocaleTimeString()} ({item.duration_ms}ms)
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-600">
                        {item.delay_before_minutes > 0 ? (
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                            {item.delay_before_minutes} min ({formatTime(item.delay_before_ms / 1000)})
                          </span>
                        ) : (
                          <span className="text-slate-400">0m (initial)</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {item.status === "SUCCESS" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Success
                          </span>
                        )}
                        {item.status === "ERROR" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-medium">
                            <XCircle className="h-3 w-3" />
                            Error
                          </span>
                        )}
                        {item.status === "RUNNING" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-medium animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Running
                          </span>
                        )}
                        {item.status === "DELAYING" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">
                            <Clock className="h-3 w-3" />
                            Delaying
                          </span>
                        )}
                        {item.status === "PENDING" && (
                          <span className="text-slate-400 text-[10px]">Queued</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide" : "Logs"}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded Drawer for Selected Row */}
          {expandedRowId && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              {(() => {
                const item = jobItems.find((r) => r.id === expandedRowId);
                if (!item) return null;
                return (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800">
                          Execution Audit Details: {item.slug}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          (Account: {jobData?.accountId || baseConfig.accountId})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        Started: {item.started_at ? new Date(item.started_at).toLocaleTimeString() : "N/A"} • Ended: {item.completed_at ? new Date(item.completed_at).toLocaleTimeString() : "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-700 mb-3">
                      <div className="p-2.5 rounded bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          Connection Action
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.connection_outcome || "N/A"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          Reaction Action
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.reaction_outcome || "N/A"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          Comment Action
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.comment_outcome || "N/A"}
                        </span>
                      </div>
                    </div>

                    {item.logs?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-800 block">
                          Step-by-Step Server Logs:
                        </span>
                        {item.logs.map((log: any) => (
                          <div
                            key={log.step}
                            className="p-2 rounded bg-white border border-slate-200 text-xs text-slate-700"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                Step {log.step}: {log.title}
                              </span>
                              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                                {log.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">{log.summary}</p>
                            {log.rawResponse && (
                              <JsonViewer data={log.rawResponse} title={`Step ${log.step} Payload`} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
