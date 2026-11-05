import type { Night } from '../digest/types.js';

const dash = '—';

export function DigestPage({ data }: { data: Night }) {
  const { night, rows, badLines } = data;
  return (
    <>
      <h1>digest · {night}</h1>
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>fails</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr class={r.retries >= 3 || r.fails > 0 ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.fails}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {badLines > 0 ? (
        <p class="warn">{badLines === 1 ? '1 line did not parse' : `${badLines} lines did not parse`}</p>
      ) : null}
    </>
  );
}

export function NoRunLog({ night }: { night: string }) {
  return <p>no run log for {night}</p>;
}
