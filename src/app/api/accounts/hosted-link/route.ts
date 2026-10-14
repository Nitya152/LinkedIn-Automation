import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey, redirectUrl } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Unipile API Key is required" }, { status: 400 });
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const targetUrl = `${baseUrl}/hosted/accounts/link`;

    const payload: any = {
      type: "create",
      providers: ["LINKEDIN"],
      api_url: baseUrl,
    };

    if (redirectUrl) {
      payload.success_redirect_url = redirectUrl;
      payload.failure_redirect_url = redirectUrl;
    }

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.url) {
      return NextResponse.json({
        success: true,
        url: data.url,
        message: "Hosted auth wizard URL generated successfully.",
        raw: data,
      });
    }

    let errorMessage =
      data?.title || data?.message || data?.error || `HTTP ${res.status}: Failed to generate hosted link`;

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
