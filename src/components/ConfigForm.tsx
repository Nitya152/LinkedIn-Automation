"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Play,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Sliders,
  KeyRound,
  UserCheck,
  Globe,
  MessageSquare,
  ThumbsUp,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { AutomationConfig, ConnectedAccount } from "@/types";
import { sanitizeBaseUrl, extractLinkedInSlug } from "@/lib/unipile";
import ConnectAccountModal from "./ConnectAccountModal";

export const DEFAULT_CONFIG: AutomationConfig = {
  baseUrl: "",
  apiKey: "",
  accountId: "",
  targetInput: "",
  message: "",
  sendWithoutNote: false,
  limit: 10,
  reactionType: "like",
  commentText: "",
};

const STORAGE_KEY = "linkedin_automation_config_v2";

interface ConfigFormProps {
  onRunAutomation: (config: AutomationConfig) => void;
  isRunning: boolean;
}

export default function ConfigForm({ onRunAutomation, isRunning }: ConfigFormProps) {
  const [config, setConfig] = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountFetchError, setAccountFetchError] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          baseUrl: parsed.baseUrl ? sanitizeBaseUrl(parsed.baseUrl) : "",
        }));
      }
    } catch (e) {
      console.warn("Failed to load saved config:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to LocalStorage whenever config changes
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn("Failed to save config:", e);
    }
  }, [config, isInitialized]);

  const handleChange = <K extends keyof AutomationConfig>(key: K, value: AutomationConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleBaseUrlBlur = () => {
    if (!config.baseUrl.trim()) return;
    const sanitized = sanitizeBaseUrl(config.baseUrl);
    handleChange("baseUrl", sanitized);
  };

  const extractedSlug = extractLinkedInSlug(config.targetInput);

  const handleFetchAccounts = async () => {
    if (!config.apiKey.trim()) {
      setAccountFetchError("Please enter your Unipile API Key first.");
      return;
    }
    setIsFetchingAccounts(true);
    setAccountFetchError(null);
    try {
      const effectiveBaseUrl = config.baseUrl.trim() || "https://api70.unipile.com:20009/api/v1";
      const sanitized = sanitizeBaseUrl(effectiveBaseUrl);
      if (config.baseUrl.trim()) {
        handleChange("baseUrl", sanitized);
      }

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: sanitized,
          apiKey: config.apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const list: ConnectedAccount[] = data.accounts || [];
      setFetchedAccounts(list);
      if (list.length > 0) {
        if (!list.some((a) => a.id === config.accountId)) {
          handleChange("accountId", list[0].id);
        }
      } else {
        setAccountFetchError("No connected accounts found for this API Key.");
      }
    } catch (err: any) {
      setAccountFetchError(err.message || "Failed to fetch accounts");
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  const handleAccountConnected = (newAccountId: string) => {
    handleChange("accountId", newAccountId);
    setAccountFetchError(null);
    handleFetchAccounts().catch(() => {});
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all parameters to default values?")) {
      setConfig(DEFAULT_CONFIG);
      setFetchedAccounts([]);
      setAccountFetchError(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBaseUrl = config.baseUrl.trim() || "https://api70.unipile.com:20009/api/v1";
    const sanitized = sanitizeBaseUrl(effectiveBaseUrl);
    const finalConfig = { ...config, baseUrl: sanitized };
    setConfig(finalConfig);
    onRunAutomation(finalConfig);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Automation Parameters</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your Unipile credentials and target profile. Changes are auto-saved locally.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Form</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ROW 1: Base URL & API Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                Unipile Base API URL
              </label>
              <span className="text-[10px] text-slate-400 font-mono">auto-sanitized</span>
            </div>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => handleChange("baseUrl", e.target.value)}
              onBlur={handleBaseUrlBlur}
              placeholder="https://api70.unipile.com:20009/api/v1"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Automatically prefixes HTTPS and appends <code className="text-slate-600">/api/v1</code>.
            </p>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                Unipile API Key
              </label>
              <span className="text-[10px] text-slate-400 font-mono">X-API-KEY</span>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                required
                value={config.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                placeholder="Enter Unipile API Key (e.g. M6UTAZQ7...+Vlk...)"
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Required for all authenticated calls.
            </p>
          </div>
        </div>

        {/* ROW 2: Account ID with "Fetch My Accounts" & Target Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                Unipile Account ID
              </label>
              <span className="text-[10px] text-slate-400 font-mono">LinkedIn Sender</span>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                required
                value={config.accountId}
                onChange={(e) => handleChange("accountId", e.target.value)}
                placeholder="Enter Account ID (e.g. BdbX2VPBS1-_nCCRdnxt_g)"
                className="flex-1 min-w-[140px] rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                title="Connect LinkedIn ID via Unipile API & OTP verification"
              >
                <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                <span>+ Connect ID</span>
              </button>
              <button
                type="button"
                disabled={isFetchingAccounts || !config.apiKey}
                onClick={handleFetchAccounts}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer"
                title="Fetch already connected accounts"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetchingAccounts ? "animate-spin" : ""}`} />
                <span>Fetch</span>
              </button>
            </div>

            {fetchedAccounts.length > 0 && (
              <div className="mt-2">
                <select
                  value={config.accountId}
                  onChange={(e) => handleChange("accountId", e.target.value)}
                  className="w-full rounded-md border border-emerald-300 bg-emerald-50/40 px-2.5 py-1.5 text-xs text-emerald-800 font-mono focus:border-emerald-600 focus:outline-none"
                >
                  {fetchedAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name || "LinkedIn Account"} ({acc.provider || "LINKEDIN"}) - {acc.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {accountFetchError && (
              <div className="mt-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 space-y-1">
                <div className="flex items-start gap-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{accountFetchError}</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed pl-5">
                  💡 <strong>Tip:</strong> If you know your Account ID, paste it directly into the field above. To reconnect an expired session, visit your <a href="https://dashboard.unipile.com" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-rose-900">Unipile Dashboard</a>.
                </p>
              </div>
            )}
          </div>

          {/* Target Profile URL or Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                Target LinkedIn Profile (URL or Slug)
              </label>
              <span className="text-[10px] text-blue-600 font-mono font-medium">
                Slug: {extractedSlug || "none"}
              </span>
            </div>
            <input
              type="text"
              required
              value={config.targetInput}
              onChange={(e) => handleChange("targetInput", e.target.value)}
              placeholder="e.g. vaidehi-gondalia-35b395250 or https://www.linkedin.com/in/username"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Accepts full profile URL or vanity slug. Strips prefixes and trailing slashes.
            </p>
          </div>
        </div>

        {/* ROW 3: Engagement Settings */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Engagement Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Posts Limit */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Posts Fetch Limit
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={config.limit}
                onChange={(e) => handleChange("limit", parseInt(e.target.value) || 10)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Sorted newest first.</p>
            </div>

            {/* Reaction Type */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5 text-blue-600" />
                Reaction Type
              </label>
              <select
                value={config.reactionType}
                onChange={(e) => handleChange("reactionType", e.target.value as any)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none capitalize"
              >
                <option value="like">👍 Like (Default)</option>
                <option value="celebrate">👏 Celebrate</option>
                <option value="support">🤝 Support</option>
                <option value="love">❤️ Love</option>
                <option value="insightful">💡 Insightful</option>
                <option value="funny">😄 Funny</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Applied to latest post.</p>
            </div>

            {/* Auto Comment Text */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  Auto-Comment (Optional)
                </span>
              </label>
              <input
                type="text"
                value={config.commentText}
                onChange={(e) => handleChange("commentText", e.target.value)}
                placeholder="e.g. Great insight! Thanks for sharing."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                If left empty, Step 5 is skipped.
              </p>
            </div>
          </div>

          {/* Connection Message & Checkbox */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">
                Connection Note
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={config.sendWithoutNote}
                  onChange={(e) => handleChange("sendWithoutNote", e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-[11px] font-medium text-amber-700">
                  Send invite without note (saves free LinkedIn account quota)
                </span>
              </label>
            </div>
            <textarea
              disabled={config.sendWithoutNote}
              rows={2}
              value={config.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="e.g. Hi, I'd like to connect with you."
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:bg-slate-100 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={isRunning}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Automation Sequence...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Full Automation</span>
              </>
            )}
          </button>
        </div>
      </form>

      <ConnectAccountModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        baseUrl={config.baseUrl}
        apiKey={config.apiKey}
        onAccountConnected={handleAccountConnected}
      />
    </div>
  );
}
