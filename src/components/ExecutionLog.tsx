"use client";

import { CheckCircle2, Clock, XCircle, AlertTriangle, CornerDownRight, Terminal } from "lucide-react";
import { AutomationStepLog, StepStatus } from "@/types";
import JsonViewer from "./JsonViewer";

interface ExecutionLogProps {
  logs: AutomationStepLog[];
  isRunning: boolean;
}

const STEP_DEFINITIONS = [
  { step: 1, title: "Resolve Public Slug to provider_id", defaultMethod: "GET" },
  { step: 2, title: "Check Connection Status & Auto-Send Invite", defaultMethod: "POST" },
  { step: 3, title: "Fetch Target's Posts (Using provider_id)", defaultMethod: "GET" },
  { step: 4, title: "Auto-Like the Latest Post", defaultMethod: "POST" },
  { step: 5, title: "Auto-Comment on the Latest Post (Optional)", defaultMethod: "POST" },
];

export default function ExecutionLog({ logs, isRunning }: ExecutionLogProps) {
  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case "success":
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Success
          </span>
        );
      case "skipped":
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Skipped
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            Error
          </span>
        );
      case "running":
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200 animate-pulse">
            <Clock className="h-3 w-3 text-blue-600 animate-spin" />
            Running
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  const getMethodBadge = (method: string) => {
    const isGet = method.toUpperCase() === "GET";
    const isPost = method.toUpperCase() === "POST";
    return (
      <span
        className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
          isGet
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : isPost
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {method}
      </span>
    );
  };

  const displaySteps = STEP_DEFINITIONS.map((def) => {
    const matchedLog = logs.find((l) => l.step === def.step);
    if (matchedLog) {
      return matchedLog;
    }
    return {
      step: def.step,
      title: def.title,
      method: def.defaultMethod,
      endpoint: "",
      url: "",
      status: "pending" as StepStatus,
      summary: "Awaiting execution sequence trigger...",
      timestamp: "",
    };
  });

  const extraLogs = logs.filter((l) => !STEP_DEFINITIONS.some((def) => def.step === l.step));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4.5 w-4.5 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">Execution Timeline</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {isRunning ? (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Running...
            </span>
          ) : logs.length > 0 ? (
            <span className="text-slate-500 font-mono text-[11px]">
              {logs.filter((l) => l.status === "success").length}/{STEP_DEFINITIONS.length} Steps Succeeded
            </span>
          ) : (
            <span className="text-slate-400 text-xs">Ready</span>
          )}
        </div>
      </div>

      {extraLogs.length > 0 && (
        <div className="mb-4 space-y-2">
          {extraLogs.map((log, idx) => (
            <div
              key={`extra-${idx}`}
              className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2"
            >
              <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{log.title}: {log.summary}</p>
                {log.error && <p className="text-[11px] text-rose-600 font-mono mt-1">{log.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {displaySteps.map((stepItem) => {
          const isPending = stepItem.status === "pending";
          return (
            <div
              key={stepItem.step}
              className={`rounded-lg border transition-all ${
                stepItem.status === "success"
                  ? "border-emerald-200 bg-emerald-50/20"
                  : stepItem.status === "skipped"
                  ? "border-amber-200 bg-amber-50/20"
                  : stepItem.status === "error"
                  ? "border-rose-200 bg-rose-50/20"
                  : isPending
                  ? "border-slate-200 bg-slate-50/40 opacity-70"
                  : "border-blue-200 bg-blue-50/30 shadow-2xs"
              } p-3.5`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      stepItem.status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : stepItem.status === "skipped"
                        ? "bg-amber-100 text-amber-800"
                        : stepItem.status === "error"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {stepItem.step}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    Step {stepItem.step}: {stepItem.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {stepItem.method && getMethodBadge(stepItem.method)}
                  {getStatusBadge(stepItem.status)}
                </div>
              </div>

              {stepItem.url && (
                <div className="flex items-center gap-2 my-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                  <CornerDownRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500 font-semibold">{stepItem.method}</span>
                  <span className="truncate">{stepItem.url}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {stepItem.summary}
              </p>

              {stepItem.rawResponse && (
                <JsonViewer
                  data={stepItem.rawResponse}
                  title={`Step ${stepItem.step} Response Data`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
