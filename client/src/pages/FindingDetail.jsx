import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { ErrorBox, Loading } from '../components/Feedback.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { TYPE_LABELS } from '../utils/format.js';

export default function FindingDetail() {
  const { scanId, findingId } = useParams();
  const { data, loading, error, reload } = useFetch(() => api.finding(scanId, findingId), [scanId, findingId]);

  if (loading && !data) return <Loading label="Loading finding" />;
  if (error) {
    return (
      <>
        <ErrorBox error={error} onRetry={reload} />
        <p><Link to={`/scans/${scanId}`}>Back to scan results</Link></p>
      </>
    );
  }

  const f = data.finding;
  return (
    <>
      <p className="crumbs"><Link to={`/scans/${scanId}`}>Back to scan results</Link></p>
      <div className="page-head">
        <div>
          <h1>{f.title}</h1>
          <p className="muted">Rule {f.ruleId}</p>
        </div>
        <SeverityBadge severity={f.severity} />
      </div>

      <section className="panel">
        <h2>Affected resource</h2>
        <dl className="facts facts-row">
          <div><dt>Name</dt><dd>{f.resourceName}</dd></div>
          <div><dt>Resource ID</dt><dd><code>{f.resourceId}</code></dd></div>
          <div><dt>Type</dt><dd>{TYPE_LABELS[f.resourceType] || f.resourceType}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <h2>Evidence from the configuration</h2>
        <pre className="evidence">{f.evidence}</pre>
      </section>

      <section className="panel">
        <h2>Failed rule</h2>
        <p>{f.description}</p>
        <h2>Why it matters</h2>
        <p>{f.whyItMatters}</p>
      </section>

      <section className="panel fix">
        <h2>Suggested fix</h2>
        <p>{f.remediation}</p>
        <p className="note">This tool never changes real cloud resources. Apply the fix yourself in your own environment.</p>
      </section>
    </>
  );
}
