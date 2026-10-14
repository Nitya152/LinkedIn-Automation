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

    const errorMessage =
      data?.title || data?.message || data?.error || `HTTP ${res.status}: Failed to generate hosted link`;
    return NextResponse.json({ error: errorMessage, raw: data }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
