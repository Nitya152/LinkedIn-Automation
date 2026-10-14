import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey, accountId, postId, reactionType = "like" } = await req.json();

    if (!apiKey || !accountId || !postId) {
      return NextResponse.json(
        { error: "apiKey, accountId, and postId are required" },
        { status: 400 }
      );
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const targetUrl = `${baseUrl}/posts/reaction`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        post_id: postId,
        reaction_type: reactionType,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || `Failed to react to post (HTTP ${res.status})`, raw: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

