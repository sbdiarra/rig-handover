import type { Night } from './types.js';

export type NightCounts = { night: string; ok: number; retry: number; fail: number; badLines: number };

/** Pure: sum a night's rows into ok / retry / fail counts. */
export function countNight(night: Night): NightCounts {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const r of night.rows) {
    retry += r.retries;
    fail += r.fails;
    ok += r.runs - r.retries - r.fails;
  }
  return { night: night.night, ok, retry, fail, badLines: night.badLines };
}
