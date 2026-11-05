import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

let dir = '';
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  copyFileSync(join('runs', '2026-10-28.jsonl'), join(dir, '2026-10-28.jsonl'));
  writeFileSync(join(dir, '2026-11-01.jsonl'), '');
  writeFileSync(
    join(dir, '2026-11-02.jsonl'),
    [
      '{"at":"2026-11-02T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      '{"at":"2026-11-02T02:00:00+01:00","job":"notes/backup","status":"ok","owner":"lane-07"}',
      '{not json',
      '',
    ].join('\n'),
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

type Body = { night: string; rows: { job: string }[]; badLines: number };

async function json(night: string): Promise<{ status: number; body: Body }> {
  const res = await app.request(`/api/digest/${night}`);
  return { status: res.status, body: (await res.json()) as Body };
}

describe('digest page', () => {
  it('lists the 5 jobs of 2026-10-28 in order', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const positions = JOBS.map((j) => html.indexOf(j));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-11-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('reports a bad line', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('1 line did not parse');
  });

  it('shows — for a null owner', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    expect(html).toContain('—');
  });

  it('marks the row with retries as warn', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    expect(html).toMatch(/class="warn"(?:(?!<\/tr>)[\s\S])*fixtures\/refresh/);
  });
});

describe('digest JSON', () => {
  it('returns { night, rows, badLines } for 2026-10-28', async () => {
    const { status, body } = await json('2026-10-28');
    expect(status).toBe(200);
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('orders rows like the HTML page', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const { body } = await json('2026-10-28');
    const jobs = body.rows.map((r) => r.job);
    const byHtml = [...jobs].sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(jobs).toEqual(byHtml);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('empty night has no rows and no bad lines', async () => {
    const { status, body } = await json('2026-11-01');
    expect(status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts the bad line', async () => {
    const { body } = await json('2026-11-02');
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });
});
