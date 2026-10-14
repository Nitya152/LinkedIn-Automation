import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey, accountId, code, provider = "LINKEDIN" } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Unipile API Key is required" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: "Verification / OTP code is required" }, { status: 400 });
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const targetUrl = `${baseUrl}/accounts/checkpoint`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        provider,
        code: code.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    // Another checkpoint triggered (e.g. 2nd factor or confirmation)
    if (res.status === 202 || data?.object === "Checkpoint") {
      const nextAccountId = data.account_id || accountId;
      const checkpointType = data.type || "OTP";
      return NextResponse.json({
        success: true,
        status: "CHECKPOINT",
        checkpointType,
        accountId: nextAccountId,
        message: `Additional verification step (${checkpointType}) required.`,
        raw: data,
      });
    }

    if (res.ok) {
      const finalAccountId = data.account_id || data.id || accountId;
      return NextResponse.json({
        success: true,
        status: "OK",
        accountId: finalAccountId,
        message: "Verification code confirmed! LinkedIn account is now connected and active.",
        raw: data,
      });
    }

    let errorMessage =
      data?.title || data?.message || data?.error || `HTTP ${res.status}: Invalid verification code`;

    if (res.status === 503 || data?.type === "errors/no_client_session") {
      errorMessage =
        "No active client session (HTTP 503): Your LinkedIn account session is disconnected or expired on the Unipile dashboard. Please reconnect your account on dashboard.unipile.com.";
    } else if (res.status === 401 || data?.type === "errors/invalid_credentials") {
      errorMessage = "Invalid API Credentials (HTTP 401): Please verify your Unipile API Key.";
    }

    return NextResponse.json({ error: errorMessage, raw: data }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
