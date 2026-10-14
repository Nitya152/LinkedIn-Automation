import db from "./db";
import { executeAutomation } from "./engine";
import { AutomationConfig } from "@/types";

const activeJobWorkers = new Set<string>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function startJobWorker(jobId: string) {
  if (activeJobWorkers.has(jobId)) {
    return;
  }
  activeJobWorkers.add(jobId);
  // Run asynchronously in the background on the server
  processJob(jobId).finally(() => {
    activeJobWorkers.delete(jobId);
  });
}

async function processJob(jobId: string) {
  try {
    while (true) {
      // 1. Fetch current job state
      const job: any = await db.queryOne("SELECT * FROM jobs WHERE id = ?", [jobId]);
      if (!job) break;

      if (job.status !== "RUNNING") {
        break;
      }

      // 2. Fetch next item to process
      const item: any = await db.queryOne(
        "SELECT * FROM job_items WHERE job_id = ? AND status IN ('PENDING', 'DELAYING') ORDER BY position ASC LIMIT 1",
        [jobId]
      );

      if (!item) {
        // All items completed
        const now = new Date().toISOString();
        await db.execute(
          `UPDATE jobs 
           SET status = 'COMPLETED', 
               completed_at = ?, 
               next_run_at = NULL, 
               current_gap_minutes = 0,
               updated_at = ?
           WHERE id = ?`,
          [now, now, jobId]
        );
        break;
      }

      // 3. Handle randomized minute-based delay before non-first items
      if (item.position > 0 && item.status !== "DELAYING") {
        const minM = Math.min(job.min_delay_minutes, job.max_delay_minutes);
        const maxM = Math.max(job.min_delay_minutes, job.max_delay_minutes);
        const randomMinutes = parseFloat((Math.random() * (maxM - minM) + minM).toFixed(2));
        const delayMs = Math.round(randomMinutes * 60 * 1000);
        const nextRunAt = new Date(Date.now() + delayMs).toISOString();

        await db.execute(
          `UPDATE jobs 
           SET next_run_at = ?, current_gap_minutes = ?, current_index = ?, updated_at = ?
           WHERE id = ?`,
          [nextRunAt, randomMinutes, item.position, new Date().toISOString(), jobId]
        );

        await db.execute(
          `UPDATE job_items 
           SET status = 'DELAYING', delay_before_minutes = ?, delay_before_ms = ?
           WHERE id = ?`,
          [randomMinutes, delayMs, item.id]
        );

        // Wait in 1-second increments so we can react to Pause or Cancel immediately
        let elapsed = 0;
        let wasCancelledOrPaused = false;
        while (elapsed < delayMs) {
          await sleep(1000);
          elapsed += 1000;

          // Re-check job status in DB
          const check: any = await db.queryOne("SELECT status FROM jobs WHERE id = ?", [jobId]);
          if (!check || check.status !== "RUNNING") {
            wasCancelledOrPaused = true;
            break;
          }
        }

        if (wasCancelledOrPaused) {
          break;
        }
      } else if (item.status === "DELAYING") {
        if (job.next_run_at) {
          const remainingMs = Math.max(0, new Date(job.next_run_at).getTime() - Date.now());
          let elapsed = 0;
          let wasCancelledOrPaused = false;
          while (elapsed < remainingMs) {
            await sleep(1000);
            elapsed += 1000;
            const check: any = await db.queryOne("SELECT status FROM jobs WHERE id = ?", [jobId]);
            if (!check || check.status !== "RUNNING") {
              wasCancelledOrPaused = true;
              break;
            }
          }
          if (wasCancelledOrPaused) break;
        }
      }

      // Check job status once more before executing
      const preRunCheck: any = await db.queryOne("SELECT status FROM jobs WHERE id = ?", [jobId]);
      if (!preRunCheck || preRunCheck.status !== "RUNNING") {
        break;
      }

      // 4. Mark item as RUNNING
      const startedAt = new Date().toISOString();
      await db.execute(
        `UPDATE job_items SET status = 'RUNNING', started_at = ? WHERE id = ?`,
        [startedAt, item.id]
      );

      await db.execute(
        `UPDATE jobs SET updated_at = ? WHERE id = ?`,
        [startedAt, jobId]
      );

      // 5. Execute automation sequence via Unipile
      const startTimePerf = performance.now();
      const config: AutomationConfig = {
        baseUrl: job.base_url,
        apiKey: job.api_key,
        accountId: job.account_id,
        targetInput: item.slug,
        message: "Hi, I'd like to connect with you.",
        sendWithoutNote: Boolean(job.send_without_note),
        limit: 10,
        reactionType: job.reaction_type,
        commentText: job.comment_text,
      };

      let result: any = null;
      try {
        result = await executeAutomation(config);
      } catch (err: any) {
        result = {
          success: false,
          logs: [],
          error: err.message,
        };
      }

      const durationMs = Math.round(performance.now() - startTimePerf);
      const completedAt = new Date().toISOString();

      const step1 = result.logs?.find((l: any) => l.step === 1);
      const step2 = result.logs?.find((l: any) => l.step === 2);
      const step3 = result.logs?.find((l: any) => l.step === 3);
      const step4 = result.logs?.find((l: any) => l.step === 4);
      const step5 = result.logs?.find((l: any) => l.step === 5);

      const itemStatus = result.success !== false ? "SUCCESS" : "ERROR";

      // 6. Save item outcome to database
      await db.execute(
        `UPDATE job_items
         SET status = ?,
             completed_at = ?,
             duration_ms = ?,
             provider_id = ?,
             name = ?,
             headline = ?,
             network_distance = ?,
             connection_outcome = ?,
             reaction_outcome = ?,
             comment_outcome = ?,
             logs_json = ?,
             raw_response_json = ?,
             error = ?
         WHERE id = ?`,
        [
          itemStatus,
          completedAt,
          durationMs,
          result.profile?.provider_id || null,
          result.profile?.name || null,
          result.profile?.headline || null,
          result.profile?.network_distance || null,
          step2?.summary || "N/A",
          step4?.summary || "N/A",
          step5?.summary || "N/A",
          JSON.stringify(result.logs || []),
          JSON.stringify(result.profile?.raw || {}),
          result.error || null,
          item.id,
        ]
      );

      // 7. Update Job Progress in DB
      await db.execute(
        `UPDATE jobs
         SET completed_profiles = completed_profiles + 1,
             next_run_at = NULL,
             current_gap_minutes = 0,
             updated_at = ?
         WHERE id = ?`,
        [completedAt, jobId]
      );
    }
  } catch (error) {
    console.error(`[Worker] Error processing job ${jobId}:`, error);
  }
}

// Automatically resume running jobs
export async function resumeRunningJobs() {
  try {
    const runningJobs: any[] = await db.query(
      "SELECT id FROM jobs WHERE status = 'RUNNING'"
    );
    for (const job of runningJobs) {
      startJobWorker(job.id);
    }
  } catch (err) {
    console.warn("[Worker] Could not check running jobs:", err);
  }
}
