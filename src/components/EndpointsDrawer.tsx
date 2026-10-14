"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Terminal, Copy, Check } from "lucide-react";

interface EndpointItem {
  name: string;
  method: "GET" | "POST";
  template: string;
  description: string;
  note?: string;
}

const ENDPOINTS: EndpointItem[] = [
  {
    name: "Profile Lookup (Resolve Vanity Slug)",
    method: "GET",
    template: "/users/{slug}?account_id={accountId}",
    description: "Resolves public vanity slug into provider_id (ACoAA...) and checks current connection status.",
    note: "Public slug is only valid here. All subsequent calls require the resolved provider_id.",
  },
  {
    name: "Send Connection Invite",
    method: "POST",
    template: "/users/invite",
    description: "Sends an invitation using provider_id. Accepts optional personalized message.",
    note: "JSON Body: { provider_id, account_id, message? }",
  },
  {
    name: "Sent Invites (Reference)",
    method: "GET",
    template: "/users/invite/sent?account_id={accountId}",
    description: "Lists all outgoing pending invitations for the connected account.",
  },
  {
    name: "Fetch Target's Posts",
    method: "GET",
    template: "/users/{providerId}/posts?account_id={accountId}&limit={limit}",
    description: "Fetches authored posts. Uses provider_id (passing slug causes 422 invalid_recipient).",
    note: "Sorted by parsed_datetime descending to guarantee freshest post.",
  },
  {
    name: "Like Post (Add Reaction)",
    method: "POST",
    template: "/posts/reaction",
    description: "Reacts to post using full social_id (urn:li:activity:...).",
    note: "JSON Body: { account_id, post_id, reaction_type }",
  },
  {
    name: "Comment Post",
    method: "POST",
    template: "/posts/{encodedSocialId}/comments",
    description: "Adds comment via multipart/form-data. Social URN is URL-encoded due to colons.",
    note: "FormData fields: account_id, text",
  },
];

export default function EndpointsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyTemplate = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-800">
            Unipile API Endpoint Specifications & Mappings
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
            6 Endpoints Active
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{isOpen ? "Collapse" : "View Specifications"}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 p-5 bg-slate-50/50 space-y-3">
          <p className="text-xs text-slate-500">
            All requests are automatically executed server-side with <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 font-mono text-[11px]">X-API-KEY</code> and <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 font-mono text-[11px]">Accept: application/json</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ENDPOINTS.map((ep, idx) => (
              <div
                key={ep.name}
                className="p-3.5 rounded-lg border border-slate-200 bg-white flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-slate-800">{ep.name}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        ep.method === "GET"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-50 rounded px-2.5 py-1.5 border border-slate-200 font-mono text-[11px] text-slate-700">
                    <span className="truncate">{ep.template}</span>
                    <button
                      type="button"
                      onClick={() => copyTemplate(ep.template, idx)}
                      title="Copy template"
                      className="text-slate-400 hover:text-slate-700 flex-shrink-0"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    {ep.description}
                  </p>
                </div>

                {ep.note && (
                  <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                    ⚡ {ep.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
