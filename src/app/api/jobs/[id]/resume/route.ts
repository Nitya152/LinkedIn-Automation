import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { startJobWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute("UPDATE jobs SET status = 'RUNNING', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      id,
    ]);
    startJobWorker(id);
    return NextResponse.json({ success: true, status: "RUNNING" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
