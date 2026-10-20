import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useDebounced, useFetch } from '../hooks.js';
import { EmptyState, ErrorBox, Loading } from '../components/Feedback.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { SEVERITY_LABELS, SEVERITY_ORDER, TYPE_LABELS, formatDate, formatScore } from '../utils/format.js';

export default function ScanDetail() {
  const { scanId } = useParams();
  const [tab, setTab] = useState('findings');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [download, setDownload] = useState({ busy: '', error: null });
  const debouncedSearch = useDebounced(search);

  const scanQuery = useFetch(() => api.scan(scanId), [scanId]);
  const findingsQuery = useFetch(
    () => (tab === 'findings' ? api.findings(scanId, { search: debouncedSearch, severity, type }) : Promise.resolve(null)),
    [scanId, tab, debouncedSearch, severity, type],
  );
  const resourcesQuery = useFetch(
    () => (tab === 'resources' ? api.resources(scanId, { search: debouncedSearch, type }) : Promise.resolve(null)),
    [scanId, tab, debouncedSearch, type],
  );

  const switchTab = (next) => {
    setTab(next);
    setSearch('');
    setSeverity('');
    setType('');
  };

  const clearFilters = () => {
    setSearch('');
    setSeverity('');
    setType('');
  };

  const getReport = async (format) => {
    setDownload({ busy: format, error: null });
    try {
      await api.downloadReport(scanId, format);
      setDownload({ busy: '', error: null });
    } catch (err) {
      setDownload({ busy: '', error: err });
    }
  };

  if (scanQuery.loading && !scanQuery.data) return <Loading label="Loading scan" />;
  if (scanQuery.error) {
    return (
      <>
        <ErrorBox error={scanQuery.error} onRetry={scanQuery.reload} />
        <p><Link to="/scans">Back to scan history</Link></p>
      </>
    );
  }

  const scan = scanQuery.data.scan;
  const s = scan.summary;
  const hasFilters = Boolean(search || severity || type);
  const active = tab === 'findings' ? findingsQuery : resourcesQuery;
  const rows = active.data ? active.data.findings || active.data.resources : null;

  return (
    <>
      <p className="crumbs"><Link to="/scans">Scan history</Link></p>
      <div className="page-head">
        <div>
          <h1>{scan.sourceName}</h1>
          <p className="muted">Scanned on {formatDate(scan.createdAt)}</p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => getReport('csv')} disabled={Boolean(download.busy)}>
            {download.busy === 'csv' ? 'Preparing CSV...' : 'Download CSV report'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => getReport('pdf')} disabled={Boolean(download.busy)}>
            {download.busy === 'pdf' ? 'Preparing PDF...' : 'Download PDF report'}
          </button>
        </div>
      </div>
      {download.error && <ErrorBox error={download.error} />}

      <section className="panel">
        <dl className="facts facts-row">
          <div><dt>Resources</dt><dd>{s.totalResources}</dd></div>
          <div><dt>Checks passed</dt><dd>{s.passedChecks} of {s.totalChecks}</dd></div>
          <div><dt>Security-check score</dt><dd>{formatScore(s.score)}</dd></div>
          <div><dt>Findings</dt><dd>{s.totalFindings}</dd></div>
        </dl>
        <div className="sev-chips">
          {SEVERITY_ORDER.map((k) => (
            <span key={k} className={`badge sev-${k}`}>{SEVERITY_LABELS[k]}: {s.findingsBySeverity[k]}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'findings'} className={tab === 'findings' ? 'tab on' : 'tab'} onClick={() => switchTab('findings')}>
            Findings ({s.totalFindings})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'resources'} className={tab === 'resources' ? 'tab on' : 'tab'} onClick={() => switchTab('resources')}>
            Resources ({s.totalResources})
          </button>
        </div>

        <div className="filters">
          <label>
            <span className="sr-only">Search</span>
            <input type="search" placeholder={tab === 'findings' ? 'Search findings' : 'Search resources'} value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {tab === 'findings' && (
            <label>
              <span className="sr-only">Severity</span>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">All severities</option>
                {SEVERITY_ORDER.map((k) => <option key={k} value={k}>{SEVERITY_LABELS[k]}</option>)}
              </select>
            </label>
          )}
          <label>
            <span className="sr-only">Resource type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All resource types</option>
              {Object.entries(TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          {hasFilters && <button type="button" className="btn btn-quiet" onClick={clearFilters}>Clear filters</button>}
        </div>

        {active.error && <ErrorBox error={active.error} onRetry={active.reload} />}
        {active.loading && !rows && <Loading label="Loading" />}

        {rows && rows.length === 0 && (
          tab === 'findings' ? (
            hasFilters ? (
              <EmptyState title="No findings match these filters" actionLabel="Clear filters" onAction={clearFilters} />
            ) : (
              <EmptyState title="No findings" text="Every applicable check passed in this scan." />
            )
          ) : (
            <EmptyState title="No resources match" text={hasFilters ? 'Try a different search or clear the filters.' : 'This scan has no resources.'} />
          )
        )}

        {rows && rows.length > 0 && tab === 'findings' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Severity</th><th>Rule</th><th>Finding</th><th>Resource</th></tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id}>
                    <td><SeverityBadge severity={f.severity} /></td>
                    <td>{f.ruleId}</td>
                    <td><Link to={`/scans/${scanId}/findings/${f.id}`}>{f.title}</Link></td>
                    <td>{f.resourceName}<div className="sub">{TYPE_LABELS[f.resourceType]}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows && rows.length > 0 && tab === 'resources' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>ID</th><th>Type</th><th>Failed checks</th><th>Configuration</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td><code>{r.resourceId}</code></td>
                    <td>{TYPE_LABELS[r.type]}</td>
                    <td>{r.findingCount === 0 ? 'None' : r.findingCount}</td>
                    <td>
                      <details>
                        <summary>View</summary>
                        <pre className="config">{JSON.stringify(r.config, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
