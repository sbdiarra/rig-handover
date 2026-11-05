import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

/** Parse one JSONL line at the edge; null when it is not a valid run line. */
export function parseLine(text: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status as RunStatus)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  const line: RunLine = { at: o.at, job: o.job, status: o.status as RunStatus, owner: o.owner };
  if (typeof o.error === 'string') line.error = o.error;
  return line;
}

/** Fold parsed lines into one row per job, sorted by job. */
export function toRows(lines: RunLine[]): DigestRow[] {
  const byJob = new Map<string, DigestRow>();
  const sorted = [...lines].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const l of sorted) {
    let r = byJob.get(l.job);
    if (!r) {
      r = { job: l.job, owner: l.owner, runs: 0, retries: 0, fails: 0, lastStatus: l.status, lastError: null, firstAt: l.at, lastAt: l.at };
      byJob.set(l.job, r);
    }
    r.runs += 1;
    if (l.status === 'retry') r.retries += 1;
    if (l.status === 'fail') r.fails += 1;
    r.lastStatus = l.status;
    r.lastAt = l.at;
    if (l.owner !== null) r.owner = l.owner;
    if (l.error !== undefined) r.lastError = l.error;
  }
  return [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}

export function parseNight(night: string, text: string): Night {
  const lines: RunLine[] = [];
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (l) lines.push(l);
    else badLines += 1;
  }
  return { night, rows: toRows(lines), badLines };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  return parseNight(night, text);
};
