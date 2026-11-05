// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl, after parsing at the edge. */
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset, kept as written
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for a night. */
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  fails: number; // lines with status "fail"
  lastStatus: RunStatus;
  lastError: string | null; // most recent error seen for this job, null if none
  firstAt: string; // as written in the log, offset kept
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
};

/**
 * Reads runs/<night>.jsonl. Returns null when the night has no file (→ 404).
 * An empty file returns { rows: [], badLines: 0 } (→ "nothing ran").
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
