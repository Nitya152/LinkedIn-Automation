"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, Code } from "lucide-react";

interface JsonViewerProps {
  data: any;
  title?: string;
  defaultOpen?: boolean;
}

export default function JsonViewer({
  data,
  title = "Raw JSON Response",
  defaultOpen = false,
}: JsonViewerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-600">
          <Code className="h-3.5 w-3.5 text-blue-600" />
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="max-h-72 overflow-auto border-t border-slate-200 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-400">
          <pre className="whitespace-pre-wrap break-all">{jsonString}</pre>
        </div>
      )}
    </div>
  );
}
