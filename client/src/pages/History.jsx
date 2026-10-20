import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { EmptyState, ErrorBox, Loading } from '../components/Feedback.jsx';
import { formatDate, formatScore } from '../utils/format.js';

export default function History() {
  const { data, loading, error, reload } = useFetch(() => api.scans(), []);
  const [deleting, setDeleting] = useState('');
  const [deleteError, setDeleteError] = useState(null);

  const remove = async (scan) => {
    if (!window.confirm(`Delete the scan "${scan.sourceName}" and all of its findings? This cannot be undone.`)) return;
    setDeleting(scan.id);
    setDeleteError(null);
    try {
      await api.deleteScan(scan.id);
      reload();
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeleting('');
    }
  };

  if (loading && !data) return <Loading label="Loading scan history" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const scans = data.scans;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Scan history</h1>
          <p className="muted">Every scan you have run. Open one to see its findings and download reports.</p>
        </div>
        <Link className="btn btn-primary" to="/scans/new">New scan</Link>
      </div>
      {deleteError && <ErrorBox error={deleteError} />}
      {scans.length === 0 ? (
        <EmptyState title="No scans yet" text="Your scans will be listed here after you run one." actionTo="/scans/new" actionLabel="Start a scan" />
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Source</th><th>Resources</th><th>Findings</th><th>Score</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id}>
                    <td>{formatDate(scan.createdAt)}</td>
                    <td>{scan.sourceName}</td>
                    <td>{scan.summary.totalResources}</td>
                    <td>{scan.summary.totalFindings}</td>
                    <td>{formatScore(scan.summary.score)}</td>
                    <td className="actions">
                      <Link to={`/scans/${scan.id}`}>Open</Link>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => remove(scan)} disabled={deleting === scan.id}>
                        {deleting === scan.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
