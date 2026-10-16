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
  Save,
  Search,
  Unlink,
} from "lucide-react";
import { AutomationConfig, ConnectedAccount, LinkedInSearchResult } from "@/types";
import { sanitizeBaseUrl, extractLinkedInSlug } from "@/lib/unipile";
import ConnectAccountModal from "./ConnectAccountModal";
import LinkedInSearchModal from "./LinkedInSearchModal";

export const DEFAULT_CONFIG: AutomationConfig = {
  baseUrl: "",
  apiKey: "",
  accountId: "",
  targetInput: "",
  message: "",
  sendWithoutNote: false,
  limit: 10,
  reactionType: "none",
  commentText: "",
};

const STORAGE_KEY = "linkedin_automation_config_v2";

interface ConfigFormProps {
  onRunAutomation: (config: AutomationConfig) => void;
  isRunning: boolean;
  onConfigChange?: (config: AutomationConfig) => void;
  initialConfig?: AutomationConfig;
}

export default function ConfigForm({
  onRunAutomation,
  isRunning,
  onConfigChange,
  initialConfig,
}: ConfigFormProps) {
  const [config, setConfig] = useState<AutomationConfig>(initialConfig || DEFAULT_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountFetchError, setAccountFetchError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedTargetProfile, setSelectedTargetProfile] = useState<LinkedInSearchResult | null>(null);

  // Load from Database and LocalStorage on mount
  useEffect(() => {
    async function loadConfig() {
      let merged = { ...(initialConfig || DEFAULT_CONFIG) };

      // 1. Try DB first
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            merged = { ...merged, ...data.config };
          }
        }
      } catch (e) {
        console.warn("Could not fetch DB config:", e);
      }

      // 2. Overlay localStorage if present
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          merged = { ...merged, ...parsed };
        }
      } catch (e) {
        console.warn("Could not read localStorage config:", e);
      }

      if (merged.baseUrl) {
        merged.baseUrl = sanitizeBaseUrl(merged.baseUrl);
      }

      setConfig(merged);
      onConfigChange?.(merged);
      setIsInitialized(true);
    }

    loadConfig();
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
    setConfig((prev) => {
      const updated = { ...prev, [key]: value };
      onConfigChange?.(updated);
      return updated;
    });
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

  const handleDisconnectAccount = async (targetId?: string) => {
    const idToDisconnect = (targetId || config.accountId).trim();
    if (!idToDisconnect) {
      setDisconnectError("No account ID selected to disconnect.");
      return;
    }
    if (!config.apiKey.trim()) {
      setDisconnectError("Unipile API Key is required to disconnect an account.");
      return;
    }

    const matchedAccount = fetchedAccounts.find((a) => a.id === idToDisconnect);
    const label = matchedAccount?.name
      ? `"${matchedAccount.name}" (${idToDisconnect})`
      : idToDisconnect;

    if (
      !confirm(
        `Are you sure you want to disconnect LinkedIn account ${label}?\n\nThis will revoke the active session in Unipile.`
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    setDisconnectError(null);
    setDisconnectMessage(null);

    try {
      const effectiveBaseUrl = config.baseUrl.trim() || "https://api70.unipile.com:20009/api/v1";
      const sanitized = sanitizeBaseUrl(effectiveBaseUrl);

      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: sanitized,
          apiKey: config.apiKey.trim(),
          accountId: idToDisconnect,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to disconnect account`);
      }

      // Remove from fetchedAccounts list
      const remaining = fetchedAccounts.filter((a) => a.id !== idToDisconnect);
      setFetchedAccounts(remaining);

      // Determine next active accountId
      let nextAccountId = "";
      if (remaining.length > 0) {
        nextAccountId = remaining[0].id;
      }
      handleChange("accountId", nextAccountId);

      // Auto-save updated settings
      const updatedConfig = { ...config, accountId: nextAccountId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      onConfigChange?.(updatedConfig);

      setDisconnectMessage(`LinkedIn account ${idToDisconnect} was disconnected and session revoked.`);
      setTimeout(() => setDisconnectMessage(null), 5000);
    } catch (err: any) {
      setDisconnectError(err.message || "Failed to disconnect account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const effectiveBaseUrl = config.baseUrl.trim() || "https://api70.unipile.com:20009/api/v1";
      const sanitized = sanitizeBaseUrl(effectiveBaseUrl);
      const toSave = { ...config, baseUrl: sanitized };

      // 1. Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

      // 2. Save to database
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });

      // 3. Notify parent
      onConfigChange?.(toSave);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all parameters to default values?")) {
      setConfig(DEFAULT_CONFIG);
      setFetchedAccounts([]);
      setAccountFetchError(null);
      localStorage.removeItem(STORAGE_KEY);
      onConfigChange?.(DEFAULT_CONFIG);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBaseUrl = config.baseUrl.trim() || "https://api70.unipile.com:20009/api/v1";
    const sanitized = sanitizeBaseUrl(effectiveBaseUrl);
    const finalConfig = { ...config, baseUrl: sanitized };
    setConfig(finalConfig);
    handleSaveConfig();
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
            Configure your Unipile credentials and target profile. Changes are auto-saved locally and in database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-md animate-in fade-in duration-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Saved to Database!</span>
            </span>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Save your credentials and settings to database so they persist for Batch runs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Form</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ROW 1: Base URL & API Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                Unipile DSN / Base API URL ($DSN)
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
              Your Unipile DSN host or API base URL. Automatically formats HTTPS and appends <code className="text-slate-600">/api/v1</code>.
            </p>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                Unipile API Key ($KEY)
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
              {config.accountId.trim() && fetchedAccounts.length === 0 && (
                <button
                  type="button"
                  disabled={isDisconnecting || !config.apiKey}
                  onClick={() => handleDisconnectAccount()}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer shadow-2xs"
                  title="Disconnect and revoke this LinkedIn account from Unipile"
                >
                  <Unlink className={`h-3.5 w-3.5 text-rose-600 ${isDisconnecting ? "animate-spin" : ""}`} />
                  <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
                </button>
              )}
            </div>

            {fetchedAccounts.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={config.accountId}
                  onChange={(e) => handleChange("accountId", e.target.value)}
                  className="flex-1 rounded-md border border-emerald-300 bg-emerald-50/40 px-2.5 py-1.5 text-xs text-emerald-800 font-mono focus:border-emerald-600 focus:outline-none"
                >
                  {fetchedAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name || "LinkedIn Account"} ({acc.provider || "LINKEDIN"}) - {acc.id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isDisconnecting || !config.accountId.trim()}
                  onClick={() => handleDisconnectAccount(config.accountId)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer shadow-2xs"
                  title="Disconnect and revoke selected account from Unipile"
                >
                  <Unlink className={`h-3 w-3 ${isDisconnecting ? "animate-spin" : ""}`} />
                  <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
                </button>
              </div>
            )}

            {disconnectMessage && (
              <div className="mt-2 p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>{disconnectMessage}</span>
              </div>
            )}

            {disconnectError && (
              <div className="mt-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{disconnectError}</span>
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
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={config.targetInput}
                onChange={(e) => {
                  handleChange("targetInput", e.target.value);
                  setSelectedTargetProfile(null);
                }}
                placeholder="e.g. vaidehi-gondalia-35b395250 or https://www.linkedin.com/in/username"
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                title="Search target profiles by Name, Title, or Company"
              >
                <Search className="h-3.5 w-3.5 text-blue-600" />
                <span>Search by Name</span>
              </button>
            </div>

            {selectedTargetProfile && (
              <div className="mt-1.5 flex items-center justify-between p-2 rounded-md bg-blue-50/70 border border-blue-200 text-xs text-blue-900 animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  <span className="font-semibold truncate">{selectedTargetProfile.name}</span>
                  {selectedTargetProfile.headline && (
                    <span className="text-slate-500 truncate text-[11px] hidden sm:inline">
                      • {selectedTargetProfile.headline}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTargetProfile(null)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-1">
              Accepts full profile URL, vanity slug, or click <strong>Search by Name</strong> to find candidates directly.
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
                <option value="none">🚫 None (Fetch posts only, do not react) (Default)</option>
                <option value="like">👍 Like</option>
                <option value="celebrate">👏 Celebrate</option>
                <option value="support">🤝 Support</option>
                <option value="love">❤️ Love</option>
                <option value="insightful">💡 Insightful</option>
                <option value="funny">😄 Funny</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {config.reactionType === "none" ? "Reaction skipped; only fetches posts & milestones." : "Applied to latest post."}
              </p>
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

      <LinkedInSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        baseUrl={config.baseUrl}
        apiKey={config.apiKey}
        accountId={config.accountId}
        onSelectProfile={(slug, profile) => {
          handleChange("targetInput", slug);
          setSelectedTargetProfile(profile);
        }}
      />
    </div>
  );
}
