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
    const errorMessage =
      data?.title || data?.message || data?.error || `HTTP ${res.status}: Failed to connect account`;
    return NextResponse.json({ error: errorMessage, raw: data }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
