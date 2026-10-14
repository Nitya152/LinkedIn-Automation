import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

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
      return NextResponse.json(
        { error: data?.message || `Failed to fetch accounts (HTTP ${res.status})`, raw: data },
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

