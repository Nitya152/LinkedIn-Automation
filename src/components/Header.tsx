"use client";

import { Zap, ShieldCheck, Sparkles } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="h-4.5 w-4.5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">
                LinkedIn Engagement Flow
              </h1>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200/80">
                Unipile API
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Automated Manager Flow: Lookup → Connection → Feed Extraction → Reaction → Comment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>CORS Proxy Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Unipile v1 Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
}
