import { NextRequest, NextResponse } from "next/server";
import { sanitizeBaseUrl } from "@/lib/unipile";

export async function POST(req: NextRequest) {
  try {
    const { baseUrl: rawBaseUrl, apiKey, accountId, postId, text } = await req.json();

    if (!apiKey || !accountId || !postId || !text?.trim()) {
      return NextResponse.json(
        { error: "apiKey, accountId, postId, and comment text are required" },
        { status: 400 }
      );
    }

    const baseUrl = sanitizeBaseUrl(rawBaseUrl);
    const encodedSocialId = encodeURIComponent(postId);
    const targetUrl = `${baseUrl}/posts/${encodedSocialId}/comments`;

    const formData = new FormData();
    formData.append("account_id", accountId);
    formData.append("text", text.trim());

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || `Failed to post comment (HTTP ${res.status})`, raw: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

