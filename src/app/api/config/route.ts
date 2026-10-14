import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.query<{ key: string; value: string }>(
      "SELECT key, value FROM settings"
    );

    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }

    return NextResponse.json({
      success: true,
      config: {
        baseUrl: config.baseUrl || "",
        apiKey: config.apiKey || "",
        accountId: config.accountId || "",
        targetInput: config.targetInput || "",
        reactionType: config.reactionType || "like",
        commentText: config.commentText || "",
        message: config.message || "",
        sendWithoutNote: config.sendWithoutNote === "true" || config.sendWithoutNote === "1",
        limit: config.limit ? parseInt(config.limit) : 10,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    const allowedKeys = [
      "baseUrl",
      "apiKey",
      "accountId",
      "targetInput",
      "reactionType",
      "commentText",
      "message",
      "sendWithoutNote",
      "limit",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined && body[key] !== null) {
        const valStr = String(body[key]);
        await db.execute("DELETE FROM settings WHERE key = ?", [key]);
        await db.execute(
          "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
          [key, valStr, now]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configuration successfully saved to database.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

