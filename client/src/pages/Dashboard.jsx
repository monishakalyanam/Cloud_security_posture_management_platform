import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../hooks.js';
import { EmptyState, ErrorBox, Loading } from '../components/Feedback.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { SEVERITY_LABELS, SEVERITY_ORDER, TYPE_LABELS, formatDate, formatScore } from '../utils/format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => api.dashboard(), []);

  if (loading && !data) return <Loading label="Loading dashboard" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  if (data.totalScans === 0) {
    return (
      <>
        <h1>Welcome, {user.name}</h1>
        <EmptyState
          title="No scans yet"
          text="Load a sample configuration or upload a JSON file, then run your first scan. Results will appear here."
          actionTo="/scans/new"
          actionLabel="Start a scan"
        />
      </>
    );
  }

  const scan = data.latestScan;
  const s = scan.summary;
  const highest = Math.max(1, ...SEVERITY_ORDER.map((k) => s.findingsBySeverity[k]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Latest scan: {scan.sourceName}, run on {formatDate(scan.createdAt)}</p>
        </div>
        <Link className="btn btn-primary" to={`/scans/${scan.id}`}>Open full results</Link>
      </div>

      <div className="grid-3">
        <section className="panel score-panel">
          <ScoreRing score={s.score} />
          <div>
            <h2>Security-check score</h2>
            <p>
              {s.passedChecks} of {s.totalChecks} applicable checks passed.
            </p>
            <p className="note">
              Passed applicable checks divided by evaluated applicable checks. This is a project score, not proof of CIS or
              NIST certification.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2>Scan totals</h2>
          <dl className="facts">
            <div><dt>Resources scanned</dt><dd>{s.totalResources}</dd></div>
            <div><dt>Checks evaluated</dt><dd>{s.totalChecks}</dd></div>
            <div><dt>Findings</dt><dd>{s.totalFindings}</dd></div>
            <div><dt>Security-check score</dt><dd>{formatScore(s.score)}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2>Findings by severity</h2>
          <ul className="bars">
            {SEVERITY_ORDER.map((key) => (
              <li key={key}>
                <span className="bar-label">{SEVERITY_LABELS[key]}</span>
                <span className="bar-track">
                  <span className={`bar-fill sev-bg-${key}`} style={{ width: `${(s.findingsBySeverity[key] / highest) * 100}%` }} />
                </span>
                <span className="bar-count">{s.findingsBySeverity[key]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Highest-severity findings in the latest scan</h2>
        {data.topFindings.length === 0 ? (
          <p className="muted">No findings. Every applicable check passed.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Severity</th><th>Rule</th><th>Finding</th><th>Resource</th></tr>
              </thead>
              <tbody>
                {data.topFindings.map((f) => (
                  <tr key={f.id}>
                    <td><SeverityBadge severity={f.severity} /></td>
                    <td>{f.ruleId}</td>
                    <td><Link to={`/scans/${scan.id}/findings/${f.id}`}>{f.title}</Link></td>
                    <td>{f.resourceName}<div className="sub">{TYPE_LABELS[f.resourceType]}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="page-head tight">
          <h2>Recent scans</h2>
          <Link to="/scans">View all ({data.totalScans})</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Source</th><th>Resources</th><th>Findings</th><th>Score</th><th></th></tr>
            </thead>
            <tbody>
              {data.recentScans.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{r.sourceName}</td>
                  <td>{r.summary.totalResources}</td>
                  <td>{r.summary.totalFindings}</td>
                  <td>{formatScore(r.summary.score)}</td>
                  <td><Link to={`/scans/${r.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
