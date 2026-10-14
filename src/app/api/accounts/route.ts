import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 });
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const targetUrl = `${baseUrl}/accounts`;

    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Unipile errors follow RFC 7807 with 'title', 'type', or 'message'
      let errorMessage = data?.title || data?.message || data?.error || `HTTP ${res.status}`;

      if (res.status === 503 || data?.type === "errors/no_client_session") {
        errorMessage = "No active client session (HTTP 503): Your LinkedIn account session is disconnected or expired on the Unipile dashboard. You can continue using your pre-filled Account ID, or reconnect on dashboard.unipile.com.";
      } else if (res.status === 401 || data?.type === "errors/invalid_credentials") {
        errorMessage = "Invalid API Credentials (HTTP 401): Please verify your Unipile API Key and Base URL.";
      }

      return NextResponse.json(
        { error: errorMessage, raw: data },
        { status: res.status }
      );
    }

    // Unipile returns { items: [...] } or direct array
    const rawItems: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    const accounts = rawItems.map((item) => ({
      id: item.id || item.account_id,
      name: item.name || item.username || item.connection?.name || "Connected Account",
      provider: item.provider || item.type || "LINKEDIN",
      status: item.status || "ACTIVE",
      created_at: item.created_at,
      raw: item,
    }));

    return NextResponse.json({ accounts, total: accounts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
