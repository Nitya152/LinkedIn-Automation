"use client";

import { useState } from "react";
import {
  X,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Smartphone,
  Globe,
} from "lucide-react";
import { sanitizeBaseUrl } from "@/lib/unipile";

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  apiKey: string;
  onAccountConnected: (accountId: string) => void;
}

export default function ConnectAccountModal({
  isOpen,
  onClose,
  baseUrl,
  apiKey,
  onAccountConnected,
}: ConnectAccountModalProps) {
  const [authMethod, setAuthMethod] = useState<"direct" | "hosted">("direct");

  // Direct login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);

  // Checkpoint / OTP state
  const [step, setStep] = useState<"credentials" | "otp" | "success">("credentials");
  const [checkpointAccountId, setCheckpointAccountId] = useState<string | null>(null);
  const [checkpointType, setCheckpointType] = useState<string>("OTP");
  const [otpCode, setOtpCode] = useState("");
  const [isSolvingOtp, setIsSolvingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Hosted link state
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [hostedError, setHostedError] = useState<string | null>(null);

  // Final connected account ID
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveBaseUrl = sanitizeBaseUrl(baseUrl || "https://api70.unipile.com:20009/api/v1");

  // Step 1: Submit direct credentials
  const handleConnectDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setDirectError("Unipile API Key is required. Please fill it in the configuration form first.");
      return;
    }
    if (!username.trim() || !password) {
      setDirectError("Please enter both LinkedIn Email/Phone and Password.");
      return;
    }

    setIsSubmitting(true);
    setDirectError(null);

    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: effectiveBaseUrl,
          apiKey: apiKey.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 202) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to connect account`);
      }

      if (data.status === "CHECKPOINT") {
        setCheckpointAccountId(data.accountId);
        setCheckpointType(data.checkpointType || "2FA / OTP");
        setOtpMessage(data.message || "Please enter the verification code sent by LinkedIn.");
        setStep("otp");
      } else if (data.status === "OK" && data.accountId) {
        setConnectedAccountId(data.accountId);
        setStep("success");
        onAccountConnected(data.accountId);
      } else {
        throw new Error(data.message || "Unknown response from Unipile");
      }
    } catch (err: any) {
      setDirectError(err.message || "An unexpected error occurred while connecting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit OTP code
  const handleSolveOtp = async (codeToSubmit?: string) => {
    const code = codeToSubmit || otpCode;
    if (!code.trim()) {
      setDirectError("Please enter the verification code.");
      return;
    }
    if (!checkpointAccountId) {
      setDirectError("Missing checkpoint account ID. Please start over.");
      return;
    }

    setIsSolvingOtp(true);
    setDirectError(null);

    try {
      const res = await fetch("/api/accounts/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: effectiveBaseUrl,
          apiKey: apiKey.trim(),
          accountId: checkpointAccountId,
          code: code.trim(),
          provider: "LINKEDIN",
        }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 202) {
        throw new Error(data.error || `HTTP ${res.status}: Verification code rejected`);
      }

      if (data.status === "CHECKPOINT") {
        setCheckpointAccountId(data.accountId || checkpointAccountId);
        setCheckpointType(data.checkpointType || "OTP");
        setOtpMessage("Additional verification required. Please check for a new code.");
        setOtpCode("");
      } else if (data.status === "OK") {
        const finalId = data.accountId || checkpointAccountId;
        setConnectedAccountId(finalId);
        setStep("success");
        onAccountConnected(finalId);
      }
    } catch (err: any) {
      setDirectError(err.message || "Failed to verify code. Please try again.");
    } finally {
      setIsSolvingOtp(false);
    }
  };

  // Helper: Resend OTP code
  const handleResendCode = async () => {
    if (!checkpointAccountId) return;
    setIsResending(true);
    setDirectError(null);
    try {
      const res = await fetch("/api/accounts/checkpoint/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: effectiveBaseUrl,
          apiKey: apiKey.trim(),
          accountId: checkpointAccountId,
          provider: "LINKEDIN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }
      setOtpMessage("A new verification code has been dispatched by LinkedIn.");
    } catch (err: any) {
      setDirectError(err.message || "Could not resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  // Helper: Try another method
  const handleTryAnotherWay = () => {
    handleSolveOtp("TRY_ANOTHER_WAY");
  };

  // Method 2: Generate Hosted Auth Link
  const handleGenerateHostedLink = async () => {
    if (!apiKey.trim()) {
      setHostedError("Unipile API Key is required. Please fill it in the configuration form first.");
      return;
    }

    setIsGeneratingLink(true);
    setHostedError(null);

    try {
      const res = await fetch("/api/accounts/hosted-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: effectiveBaseUrl,
          apiKey: apiKey.trim(),
          redirectUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to generate hosted link.");
      }

      setHostedUrl(data.url);
    } catch (err: any) {
      setHostedError(err.message || "Failed to generate hosted link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleReset = () => {
    setStep("credentials");
    setCheckpointAccountId(null);
    setOtpCode("");
    setDirectError(null);
    setOtpMessage(null);
    setConnectedAccountId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 border border-blue-100">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connect LinkedIn Account</h3>
              <p className="text-xs text-slate-500">
                Authenticate via Unipile API to generate an active Account ID
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Auth Method Tabs */}
        {step !== "success" && (
          <div className="mt-4 flex rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("direct");
                handleReset();
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 transition-all cursor-pointer ${
                authMethod === "direct"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Direct Login & OTP Window</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("hosted");
                handleReset();
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 transition-all cursor-pointer ${
                authMethod === "hosted"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "hover:text-slate-900"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Hosted Link (Dashboard Style)</span>
            </button>
          </div>
        )}

        {/* METHOD 1: DIRECT LOGIN & OTP */}
        {authMethod === "direct" && (
          <div className="mt-5 space-y-4">
            {/* STEP 1: CREDENTIALS */}
            {step === "credentials" && (
              <form onSubmit={handleConnectDirect} className="space-y-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 space-y-1">
                  <p className="font-medium flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                    Direct API Authentication
                  </p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Credentials are securely posted to Unipile&apos;s <code>/accounts</code> endpoint. If LinkedIn triggers 2FA or security checkpoints, the OTP verification window will open automatically.
                  </p>
                </div>

                {directError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
                    <p className="font-medium">Connection Error</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{directError}</p>
                    {directError.toLowerCase().includes("credentials") && (
                      <p className="text-[11px] text-rose-700 pt-1">
                        💡 <strong>Tip:</strong> If your password is correct but LinkedIn is blocking automated login, switch to the{" "}
                        <button
                          type="button"
                          onClick={() => setAuthMethod("hosted")}
                          className="underline font-semibold hover:text-rose-900 cursor-pointer"
                        >
                          Hosted Link (Dashboard Style)
                        </button>{" "}
                        tab above.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    LinkedIn Email or Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="you@company.com or +1234567890"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    LinkedIn Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50/50 pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !username.trim() || !password}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Authenticating with Unipile...</span>
                      </>
                    ) : (
                      <>
                        <span>Authenticate & Connect</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: OTP / CHECKPOINT WINDOW */}
            {step === "otp" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900">
                    <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Security Verification Checkpoint ({checkpointType})
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        {otpMessage || "LinkedIn sent a one-time verification code to verify this session."}
                      </p>
                    </div>
                  </div>

                  {checkpointAccountId && (
                    <div className="text-[10px] text-amber-700 font-mono bg-amber-100/60 p-1.5 rounded">
                      Intent Account ID: <strong>{checkpointAccountId}</strong> (active for 5 min)
                    </div>
                  )}
                </div>

                {directError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <p className="font-medium">Verification Notice</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">{directError}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Enter Verification Code (OTP / 2FA)
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 rounded-lg border-2 border-blue-400 bg-white text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-[11px] text-slate-500 text-center">
                    Check your LinkedIn mobile app prompt, SMS, or authentication app.
                  </p>
                </div>

                {/* OTP Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSolveOtp()}
                    disabled={isSolvingOtp || !otpCode.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSolvingOtp ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Code with Unipile...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirm & Complete Connection</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResendCode}
                      className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {isResending ? "Resending code..." : "Resend Code"}
                    </button>

                    <button
                      type="button"
                      onClick={handleTryAnotherWay}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Try Another Method
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* METHOD 2: HOSTED AUTH LINK */}
        {authMethod === "hosted" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-700 space-y-1.5">
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-blue-600" />
                Unipile Official Hosted Wizard
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Generates a secure Unipile hosted authentication session (identical to the Unipile dashboard). You log in through Unipile&apos;s UI, which automatically guides you through any LinkedIn captcha, SMS, or OTP checkpoints.
              </p>
            </div>

            {hostedError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <p className="font-medium">Error</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{hostedError}</p>
              </div>
            )}

            {!hostedUrl ? (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  disabled={isGeneratingLink}
                  onClick={handleGenerateHostedLink}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingLink ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Link...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Generate Hosted Auth Link</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-start gap-2 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold">Hosted Link Ready!</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Click the button below to complete LinkedIn login in a new tab. When finished, return here and click &quot;Fetch Accounts&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={hostedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors"
                  >
                    <span>Open Unipile Auth Wizard</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SUCCESS SCREEN */}
        {step === "success" && (
          <div className="mt-5 text-center space-y-4 py-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">
                LinkedIn Account Connected Successfully!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Your LinkedIn account has been authenticated with Unipile.
              </p>
            </div>

            {connectedAccountId && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 font-mono">
                <span className="text-[11px] text-emerald-700 block mb-0.5 font-sans font-medium">
                  Your New Unipile Account ID:
                </span>
                <span className="text-sm font-bold">{connectedAccountId}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              Apply Account ID & Start Automating
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

