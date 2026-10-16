#!/usr/bin/env node
/**
 * LinkedIn Batch Automation Runner with Randomized Minute-Based Delays
 * 
 * Usage:
 *   node scripts/batch-runner.mjs [options]
 * 
 * Options:
 *   --slugs "slug1,slug2,..."      Comma or newline separated LinkedIn slugs/URLs
 *   --file <path>                  File containing one slug per line
 *   --min-delay <minutes>          Minimum delay between requests in MINUTES (default: 2)
 *   --max-delay <minutes>          Maximum delay between requests in MINUTES (default: 5)
 *   --account <accountId>          Unipile Account ID (default: BdbX2VPBS1-_nCCRdnxt_g)
 *   --api-key <apiKey>             Unipile API Key (default: prefilled)
 *   --base-url <url>               Unipile Base URL (default: https://api70.unipile.com:20009/api/v1)
 *   --reaction <type>              like, celebrate, support, love, insightful, funny, none (default: like)
 *   --comment <text>               Optional auto-comment text
 *   --no-note                      Send invite without note
 *   --out <file>                   Path to write JSON execution audit log
 */

import fs from 'node:fs';
import path from 'node:path';

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue = undefined) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}
const hasFlag = (name) => args.includes(`--${name}`);

const serverUrl = getArg('server', process.env.SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '');
const baseUrl = getArg('base-url', process.env.UNIPILE_BASE_URL || 'https://api70.unipile.com:20009/api/v1');
const apiKey = getArg('api-key', process.env.UNIPILE_API_KEY || 'M6UTAZQ7.+VlkKMR+9Zitw9LSF3L+Ay5YT9FuYilZNU/hy8jE/SE=');
const accountId = getArg('account', process.env.UNIPILE_ACCOUNT_ID || 'BdbX2VPBS1-_nCCRdnxt_g');
const minDelayMinutes = Math.max(0.1, parseFloat(getArg('min-delay', '2')));
const maxDelayMinutes = Math.max(minDelayMinutes, parseFloat(getArg('max-delay', '5')));
const reactionType = getArg('reaction', 'like');
const commentText = getArg('comment', '');
const sendWithoutNote = hasFlag('no-note');
const outputFile = getArg('out', `batch-audit-log-${Date.now()}.json`);

// Extract slugs
let rawSlugsInput = getArg('slugs', '');
const filePath = getArg('file', '');

if (filePath && fs.existsSync(filePath)) {
  rawSlugsInput = fs.readFileSync(filePath, 'utf8');
}

if (!rawSlugsInput.trim()) {
  rawSlugsInput = `vaidehi-gondalia-35b395250
satyanadella
williamhgates
sundarpichai
jeffweiner08`;
}

function extractSlug(input) {
  if (!input) return '';
  let cleaned = input.trim().split('?')[0].split('#')[0].replace(/\/+$/, '');
  const match = cleaned.match(/(?:linkedin\.com\/in\/|in\/)([^/]+)/i);
  if (match && match[1]) return decodeURIComponent(match[1].trim());
  cleaned = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^\/+/, '');
  return cleaned;
}

function formatMinutesAndSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

const slugs = rawSlugsInput
  .split(/[\n,]+/)
  .map(s => extractSlug(s))
  .filter(Boolean);

console.log('\n================================================================');
console.log('🚀 LinkedIn Multi-Profile Batch Automation Engine (Minute Intervals)');
console.log('================================================================');
console.log(`Account ID      : ${accountId}`);
console.log(`Profiles Count  : ${slugs.length}`);
console.log(`Random Gap Range: ${minDelayMinutes} min - ${maxDelayMinutes} min`);
console.log(`Reaction Type   : ${reactionType}`);
console.log(`Auto-Comment    : ${commentText ? `"${commentText}"` : '(None)'}`);
console.log(`Invite Note     : ${sendWithoutNote ? 'Without Note (saves quota)' : 'Standard Note'}`);
console.log(`Audit Log Output: ${outputFile}`);
console.log('================================================================\n');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const auditLogs = [];

async function runBatch() {
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const itemNumber = i + 1;

    // Apply random delay in MINUTES before starting (after the first profile)
    let delayMinutes = 0;
    let delayMs = 0;

    if (i > 0) {
      delayMinutes = parseFloat((Math.random() * (maxDelayMinutes - minDelayMinutes) + minDelayMinutes).toFixed(2));
      delayMs = Math.round(delayMinutes * 60 * 1000);
      const formattedDuration = formatMinutesAndSeconds(delayMs / 1000);

      console.log(`\n⏳ [${new Date().toLocaleTimeString()}] Random interval active: Pausing ${delayMinutes} minutes (${formattedDuration}) before starting profile ${itemNumber}/${slugs.length} (${slug})...`);
      
      // Countdown tick every 10 seconds in console
      let remainingMs = delayMs;
      while (remainingMs > 0) {
        const step = Math.min(10000, remainingMs);
        await sleep(step);
        remainingMs -= step;
        if (remainingMs > 0) {
          process.stdout.write(`   ...remaining gap: ${formatMinutesAndSeconds(remainingMs / 1000)}\r`);
        }
      }
      console.log(`   ✔ Random gap completed. Dispatching request for ${slug}...`);
    }

    const startTimestamp = new Date().toISOString();
    const startTimeFormatted = new Date().toLocaleTimeString();

    console.log(`\n▶ [${startTimeFormatted}] [Profile ${itemNumber}/${slugs.length}] Starting Automation for: ${slug}`);
    console.log(`  Account: ${accountId} | Gap Before: ${delayMinutes} mins`);

    const record = {
      index: itemNumber,
      slug,
      accountId,
      delayBeforeMinutes: delayMinutes,
      startedAt: startTimestamp,
      startedAtFormatted: startTimeFormatted,
      status: 'running',
    };

    const startTimePerf = performance.now();

    try {
      const response = await fetch(`${serverUrl}/api/automate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          accountId,
          targetInput: slug,
          message: "Hi, I'd like to connect with you.",
          sendWithoutNote,
          limit: 10,
          reactionType,
          commentText,
        }),
      });

      const data = await response.json();
      const endTimePerf = performance.now();
      const durationMs = Math.round(endTimePerf - startTimePerf);
      const completedTimestamp = new Date().toISOString();
      const completedTimeFormatted = new Date().toLocaleTimeString();

      record.completedAt = completedTimestamp;
      record.completedAtFormatted = completedTimeFormatted;
      record.durationMs = durationMs;
      record.success = data.success !== false;
      record.profile = data.profile || null;
      record.latestPost = data.latestPost || null;
      record.postsCount = data.posts?.length || 0;
      record.logs = data.logs || [];

      const step1 = data.logs?.find(l => l.step === 1);
      const step2 = data.logs?.find(l => l.step === 2);
      const step3 = data.logs?.find(l => l.step === 3);
      const step4 = data.logs?.find(l => l.step === 4);
      const step5 = data.logs?.find(l => l.step === 5);

      record.outcomes = {
        lookup: step1?.summary || 'N/A',
        connection: step2?.summary || 'N/A',
        posts: step3?.summary || 'N/A',
        reaction: step4?.summary || 'N/A',
        comment: step5?.summary || 'N/A',
      };

      if (data.success !== false) {
        record.status = 'success';
        console.log(`  ✔ [${completedTimeFormatted}] Succeeded in ${durationMs}ms`);
        console.log(`    - Resolved Provider ID: ${data.profile?.provider_id || 'N/A'}`);
        console.log(`    - Connection Action   : ${step2?.summary || 'N/A'}`);
        console.log(`    - Reaction Action     : ${step4?.summary || 'N/A'}`);
        console.log(`    - Comment Action      : ${step5?.summary || 'N/A'}`);
      } else {
        record.status = 'error';
        record.error = data.error || 'Automation step failed';
        console.log(`  ✖ [${completedTimeFormatted}] Error: ${record.error}`);
        if (data.logs?.length) {
          const errLog = data.logs.find(l => l.status === 'error');
          if (errLog) console.log(`    - Step ${errLog.step} (${errLog.title}): ${errLog.summary}`);
        }
      }
    } catch (err) {
      const endTimePerf = performance.now();
      record.completedAt = new Date().toISOString();
      record.completedAtFormatted = new Date().toLocaleTimeString();
      record.durationMs = Math.round(endTimePerf - startTimePerf);
      record.status = 'error';
      record.error = err.message;
      console.log(`  ✖ Exception: ${err.message}`);
    }

    auditLogs.push(record);
    fs.writeFileSync(outputFile, JSON.stringify(auditLogs, null, 2), 'utf8');
  }

  console.log('\n================================================================');
  console.log('🎉 Batch Run Completed!');
  console.log('================================================================');
  console.table(
    auditLogs.map(l => ({
      '#': l.index,
      'Slug': l.slug,
      'Account': l.accountId.slice(0, 10) + '...',
      'Gap (Mins)': `${l.delayBeforeMinutes}m`,
      'Start Time': l.startedAtFormatted,
      'End Time': l.completedAtFormatted,
      'Duration': `${l.durationMs}ms`,
      'Status': l.status,
    }))
  );
  console.log(`\nAudit log saved to: ${path.resolve(outputFile)}\n`);
}

runBatch().catch(console.error);
