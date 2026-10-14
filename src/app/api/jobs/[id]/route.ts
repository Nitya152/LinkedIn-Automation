import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { startJobWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job: any = await db.queryOne("SELECT * FROM jobs WHERE id = ?", [id]);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const items: any[] = await db.query(
      "SELECT * FROM job_items WHERE job_id = ? ORDER BY position ASC",
      [id]
    );

    // Self-healing: if the job is RUNNING and its scheduled interval has elapsed,
    // ensure the worker is running (crucial for Vercel serverless where background workers can freeze)
    if (job.status === "RUNNING") {
      const hasUnfinished = items.some(
        (i) => i.status === "PENDING" || i.status === "DELAYING"
      );
      if (hasUnfinished) {
        const isTimeDue = !job.next_run_at || new Date(job.next_run_at).getTime() <= Date.now();
        if (isTimeDue) {
          startJobWorker(job.id);
        }
      }
    }

    const formattedItems = items.map((item) => ({
      ...item,
      logs: item.logs_json ? JSON.parse(item.logs_json) : [],
      raw_response: item.raw_response_json ? JSON.parse(item.raw_response_json) : {},
    }));

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        accountId: job.account_id,
        baseUrl: job.base_url,
        minDelayMinutes: job.min_delay_minutes,
        maxDelayMinutes: job.max_delay_minutes,
        totalProfiles: job.total_profiles,
        completedProfiles: job.completed_profiles,
        currentIndex: job.current_index,
        nextRunAt: job.next_run_at,
        currentGapMinutes: job.current_gap_minutes,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      },
      items: formattedItems,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute("DELETE FROM jobs WHERE id = ?", [id]);
    return NextResponse.json({ success: true, message: "Job deleted from database" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
