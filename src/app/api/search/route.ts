import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl, extractLinkedInSlug } from "@/lib/unipile";
import { LinkedInSearchResult } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      baseUrl: rawBaseUrl,
      apiKey,
      accountId,
      keywords,
      cursor,
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "Unipile API Key is required" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Unipile Account ID is required" }, { status: 400 });
    }
    if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
      return NextResponse.json(
        { error: "Please enter a search term, name, or keywords" },
        { status: 400 }
      );
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const searchUrl = `${baseUrl}/linkedin/search?account_id=${encodeURIComponent(accountId)}`;

    const payload: Record<string, any> = {
      api: "classic",
      category: "people",
      keywords: keywords.trim(),
    };

    if (cursor) {
      payload.cursor = cursor;
    }

    const res = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg =
        data?.message || data?.error || data?.title || `HTTP ${res.status}: Failed to perform LinkedIn search`;
      return NextResponse.json({ error: errMsg, raw: data }, { status: res.status });
    }

    const rawItems: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    const results: LinkedInSearchResult[] = rawItems.map((item) => {
      const fullName =
        item.name ||
        [item.first_name, item.last_name].filter(Boolean).join(" ") ||
        "LinkedIn Member";

      const slug =
        item.public_identifier ||
        extractLinkedInSlug(item.profile_url || "") ||
        item.id ||
        "";

      return {
        id: item.id || item.provider_id,
        provider_id: item.provider_id || (item.id?.startsWith("ACoAA") ? item.id : undefined),
        public_identifier: slug,
        name: fullName,
        first_name: item.first_name,
        last_name: item.last_name,
        headline: item.headline || item.title || "",
        location: item.location || "",
        profile_url: item.profile_url || (slug ? `https://www.linkedin.com/in/${slug}` : undefined),
        profile_picture_url: item.profile_picture_url || item.picture_url,
        distance: item.distance || item.network_distance,
      };
    });

    return NextResponse.json({
      success: true,
      results,
      cursor: data?.cursor || null,
      totalCount: results.length,
    });
  } catch (err: any) {
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");
    const errMsg = isTimeout
      ? "LinkedIn search timed out (15s). Please check your Unipile connection or try again."
      : err.message || "An unexpected error occurred during search";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
