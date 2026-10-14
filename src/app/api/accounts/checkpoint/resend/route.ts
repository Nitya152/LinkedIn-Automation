import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey, accountId, provider = "LINKEDIN" } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Unipile API Key is required" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const targetUrl = `${baseUrl}/accounts/checkpoint/resend`;

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
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return NextResponse.json({
        success: true,
        message: "New verification code has been resent to your LinkedIn contact.",
        raw: data,
      });
    }

    const errorMessage =
      data?.title || data?.message || data?.error || `HTTP ${res.status}: Failed to resend code`;
    return NextResponse.json({ error: errorMessage, raw: data }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
