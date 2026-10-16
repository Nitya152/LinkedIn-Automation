import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey, username, password } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Unipile API Key is required" }, { status: 400 });
    }
    if (!username || !password) {
      return NextResponse.json(
        { error: "LinkedIn Email/Phone and Password are required" },
        { status: 400 }
      );
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const targetUrl = `${baseUrl}/accounts`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        provider: "LINKEDIN",
        username: username.trim(),
        password: password,
      }),
    });

    const data = await res.json().catch(() => ({}));

    // 202 Accepted: Checkpoint (OTP / 2FA / CAPTCHA) triggered
    if (res.status === 202 || data?.object === "Checkpoint" || data?.checkpoint) {
      const accountId = data.account_id || data.id || data.checkpoint?.account_id;
      const checkpointType = data.type || data.checkpoint?.type || "OTP";

      return NextResponse.json({
        success: true,
        status: "CHECKPOINT",
        checkpointType,
        accountId,
        message: `Verification checkpoint (${checkpointType}) triggered. Please enter the verification code sent by LinkedIn.`,
        raw: data,
      });
    }

    // 200 or 201: Account Connected Immediately
    if (res.ok) {
      const accountId = data.account_id || data.id || data.item?.id;
      return NextResponse.json({
        success: true,
        status: "OK",
        accountId,
        message: "LinkedIn account connected successfully!",
        raw: data,
      });
    }

    // Error handling
    let errorMessage =
      data?.title || data?.message || data?.error || `HTTP ${res.status}: Failed to connect account`;

    if (res.status === 503 || data?.type === "errors/no_client_session") {
      errorMessage =
        "No active client session (HTTP 503): Your LinkedIn account session is disconnected or expired on the Unipile dashboard. Please reconnect your account on dashboard.unipile.com.";
    } else if (
      data?.type === "errors/invalid_credentials" ||
      data?.message?.toLowerCase().includes("credentials") ||
      data?.title?.toLowerCase().includes("credentials") ||
      data?.error?.toLowerCase().includes("credentials")
    ) {
      errorMessage =
        "Invalid LinkedIn Credentials (HTTP 401): LinkedIn rejected your email or password. Please verify your credentials or switch to the 'Hosted Link' tab to sign in securely.";
    } else if (res.status === 401 || data?.type === "errors/unauthorized") {
      errorMessage = "Invalid API Credentials (HTTP 401): Please verify your Unipile API Key ($KEY) and Base URL ($DSN).";
    }

    return NextResponse.json({ error: errorMessage, raw: data }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
