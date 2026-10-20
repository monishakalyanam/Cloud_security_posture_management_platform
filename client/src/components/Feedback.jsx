import { Link } from 'react-router-dom';

export function Loading({ label = 'Loading' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}...</span>
    </div>
  );
}

export function EmptyState({ title, text, actionTo, actionLabel, onAction }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionTo && <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>}
      {onAction && <button type="button" className="btn" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

// Shows an API error. If the server sent a list of problems (validation), each one is listed.
export function ErrorBox({ error, onRetry }) {
  const details = Array.isArray(error?.details) ? error.details : [];
  return (
    <div className="alert alert-error" role="alert">
      <strong>{error?.message || 'Something went wrong.'}</strong>
      {details.length > 0 && (
        <ul className="problems">
          {details.map((d, i) => (
            <li key={i}>
              <code>{d.path}</code> {d.message}
            </li>
          ))}
        </ul>
      )}
      {onRetry && <button type="button" className="btn btn-small" onClick={onRetry}>Try again</button>}
    </div>
  );
}
