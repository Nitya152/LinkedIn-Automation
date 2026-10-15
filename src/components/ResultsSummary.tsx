"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  ThumbsUp,
  MessageSquare,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { AutomationResponse, AutomationStepLog, ProfileInfo, PostItem, RelationshipMilestone } from "@/types";

interface ResultsSummaryProps {
  results: {
    isRunning: boolean;
    logs: AutomationStepLog[];
    profile: ProfileInfo | null;
    posts: PostItem[];
    latestPost?: PostItem | null;
    milestones?: RelationshipMilestone[];
    stats: {
      durationMs: number;
      completedAt: string;
      success: boolean;
    } | null;
    error: string | null;
  };
  onJumpToPosts?: () => void;
  onJumpToLogs?: () => void;
}

export default function ResultsSummary({
  results,
  onJumpToPosts,
  onJumpToLogs,
}: ResultsSummaryProps) {
  const { isRunning, logs, profile, posts, latestPost, stats, error, milestones } = results;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySummary = () => {
    const summaryText = `[LinkedIn Automation Results]
Completed at: ${stats?.completedAt || new Date().toLocaleTimeString()}
Duration: ${stats?.durationMs || 0}ms
Target Profile: ${profile?.name || "N/A"} (${profile?.provider_id || "N/A"})
Connection: ${profile?.is_relationship ? "1st Degree Connected" : "Invite checked"}
Posts Fetched: ${posts.length}
Latest Post ID: ${latestPost?.social_id || "None"}
Steps:
${logs.map((l) => `• Step ${l.step} [${l.status.toUpperCase()}]: ${l.summary}`).join("\n")}
`;
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  if (!stats && !isRunning && logs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Execution Results</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure parameters above and click <strong>"Run Full Automation"</strong> to see live step outcomes, resolved profile intelligence, and interaction results here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Derive individual step outcomes
  const step1 = logs.find((l) => l.step === 1);
  const step2 = logs.find((l) => l.step === 2);
  const step3 = logs.find((l) => l.step === 3);
  const step4 = logs.find((l) => l.step === 4);
  const step5 = logs.find((l) => l.step === 5);

  const isSuccess = stats?.success !== false && !error;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isRunning
                ? "bg-blue-600 animate-ping"
                : isSuccess
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
          />
          <h3 className="text-sm font-semibold text-slate-900">
            {isRunning ? "Automation In Progress..." : "Automation Results Summary"}
          </h3>
          {stats && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                isSuccess
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isSuccess ? "Flow Completed" : "Completed with Notices"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {stats.durationMs}ms ({stats.completedAt})
            </span>
          )}
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors font-medium shadow-2xs"
          >
            {copiedSummary ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Results Outcomes */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outcome 1: Resolved Profile */}
        <div className="p-4 rounded-lg border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-slate-700">Target Profile</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  step1?.status === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : step1?.status === "error"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {step1?.status || "pending"}
              </span>
            </div>
            {profile ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {profile.name || "LinkedIn User"}
                </p>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {profile.headline || "No headline available"}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px] font-mono bg-white border border-slate-200 rounded px-2 py-1 text-slate-700">
                  <span className="truncate">{profile.provider_id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.provider_id, "provider_id")}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copy provider_id"
                  >
                    {copiedId === "provider_id" ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No profile resolved yet</p>
            )}
          </div>
          {profile?.network_distance && (
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Network:</span>
              <span className="font-medium text-slate-800">{profile.network_distance}</span>
            </div>
          )}
        </div>

        {/* Outcome 2: Connection Status & Invite */}
        <div className="p-4 rounded-lg border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-slate-700">Connection Action</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  step2?.status === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : step2?.status === "skipped"
                    ? "bg-amber-100 text-amber-700"
                    : step2?.status === "error"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {step2?.status || "pending"}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {step2?.summary || "Awaiting connection evaluation..."}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Invite Note:</span>
            <span className="font-medium text-slate-800">
              {step2?.requestBody?.message ? "Included" : "None / Free quota"}
            </span>
          </div>
        </div>

        {/* Outcome 3: Posts & Auto-Like */}
        <div className="p-4 rounded-lg border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-slate-700">Latest Post & Reaction</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  step4?.status === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : step4?.status === "skipped"
                    ? "bg-amber-100 text-amber-700"
                    : step4?.status === "error"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {step4?.status || "pending"}
              </span>
            </div>
            {latestPost ? (
              <div>
                <p className="text-xs text-slate-600 line-clamp-2 italic">
                  "{latestPost.text || "Media / Link update"}"
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                  <ThumbsUp className="h-3.5 w-3.5 text-blue-600" />
                  <span className="capitalize">
                    {step4?.status === "success"
                      ? `Reacted with ${step4?.requestBody?.reaction_type || "like"}`
                      : step4?.summary || "No reaction applied"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No post targeted yet</p>
            )}
          </div>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Posts Found:</span>
            <span className="font-medium text-slate-800">{posts.length}</span>
          </div>
        </div>

        {/* Outcome 4: Auto-Comment */}
        <div className="p-4 rounded-lg border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-slate-700">Auto-Comment</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  step5?.status === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : step5?.status === "skipped"
                    ? "bg-amber-100 text-amber-700"
                    : step5?.status === "error"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {step5?.status || "pending"}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {step5?.summary || "Awaiting comment step..."}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Payload:</span>
            <span className="font-medium text-slate-800 truncate max-w-[120px]">
              {step5?.requestBody?.text ? `"${step5.requestBody.text}"` : "None"}
            </span>
          </div>
        </div>
      </div>

      {/* Relationship Milestones & Special Days */}
      {milestones && milestones.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-purple-50/60 border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Relationship Milestones Detected ({milestones.length})
              </h4>
            </div>
            <span className="text-[11px] text-indigo-700 font-medium">
              High-converting outreach opportunities for Relationship Managers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="p-3.5 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                      <span>
                        {m.type === "WORK_ANNIVERSARY"
                          ? "🏆"
                          : m.type === "BIRTHDAY"
                          ? "🎂"
                          : m.type === "NEW_ROLE"
                          ? "🚀"
                          : "❤️"}
                      </span>
                      <span className="truncate">{m.title}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0">
                      {m.dateText}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {m.context}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Outreach Template:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(m.suggestedMessage, m.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied Note!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-indigo-600" />
                        <span>Copy Outreach Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

