import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox } from '../components/Feedback.jsx';

const MAX_BYTES = 1024 * 1024; // 1 MB, the same limit the server enforces

export default function NewScan() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [text, setText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('upload');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null); // { kind: 'error' | 'success', text, details }

  const fail = (err) => setMessage({ kind: 'error', text: err.message, details: err.details });

  const loadSample = async (id) => {
    setBusy('sample');
    setMessage(null);
    try {
      const sample = await api.sample(id);
      setText(sample.content);
      setSourceName(sample.name);
      setSourceType('sample');
    } catch (err) {
      fail(err);
    } finally {
      setBusy('');
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be chosen again later
    if (!file) return;
    setMessage(null);
    if (!file.name.toLowerCase().endsWith('.json')) return setMessage({ kind: 'error', text: 'Please choose a .json file.' });
    if (file.size > MAX_BYTES) return setMessage({ kind: 'error', text: 'That file is larger than 1 MB. Use a smaller file.' });
    setText(await file.text());
    setSourceName(file.name);
    setSourceType('upload');
  };

  // The browser checks that the text is JSON at all; the server checks that it follows our schema.
  const parse = () => {
    try {
      return { config: JSON.parse(text) };
    } catch (err) {
      setMessage({ kind: 'error', text: `This is not valid JSON: ${err.message}` });
      return null;
    }
  };

  const checkFile = async () => {
    const parsed = parse();
    if (!parsed) return;
    setBusy('validate');
    setMessage(null);
    try {
      const result = await api.validateScan(parsed.config);
      setMessage({ kind: 'success', text: `The file is valid: ${result.resourceCount} resources found. You can run the scan.` });
    } catch (err) {
      fail(err);
    } finally {
      setBusy('');
    }
  };

  const runScan = async () => {
    const parsed = parse();
    if (!parsed) return;
    setBusy('scan');
    setMessage(null);
    try {
      const result = await api.createScan({ config: parsed.config, sourceName: sourceName || 'Pasted JSON', sourceType });
      navigate(`/scans/${result.scan.id}`);
    } catch (err) {
      fail(err);
      setBusy('');
    }
  };

  const clearAll = () => {
    setText('');
    setSourceName('');
    setMessage(null);
  };

  const working = busy !== '';

  return (
    <>
      <h1>New scan</h1>
      <p className="muted">
        Choose a sample or upload a JSON file describing mock cloud resources, then run the scan. Nothing is sent to any cloud
        provider.
      </p>

      <section className="panel">
        <h2>1. Provide a configuration</h2>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => loadSample('secure')} disabled={working}>Load secure sample</button>
          <button type="button" className="btn" onClick={() => loadSample('insecure')} disabled={working}>Load insecure sample</button>
          <button type="button" className="btn" onClick={() => loadSample('invalid')} disabled={working}>Load invalid sample</button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={working}>Upload JSON file</button>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={onFile} hidden />
        </div>
        {sourceName && <p className="muted">Loaded: <strong>{sourceName}</strong>. You can edit the JSON below before scanning.</p>}
        <label className="sr-only" htmlFor="config-json">Configuration JSON</label>
        <textarea
          id="config-json"
          className="code-area"
          rows={16}
          spellCheck={false}
          placeholder='Paste JSON here, or load a sample above. Example: { "storageBuckets": [ ... ] }'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <details className="schema-help">
          <summary>What should the JSON contain?</summary>
          <p>
            An object with any of these sections: <code>storageBuckets</code>, <code>securityGroups</code>,{' '}
            <code>iamUsers</code>, <code>iamPolicies</code>, <code>databases</code> (plus an optional <code>metadata</code>).
            Every resource needs a unique <code>id</code>. Missing or wrongly typed fields are reported as errors; they are never
            assumed to be secure. The full schema is in <code>docs/SCHEMA.md</code>.
          </p>
        </details>
      </section>

      <section className="panel">
        <h2>2. Check and scan</h2>
        <div className="btn-row">
          <button type="button" className="btn" onClick={checkFile} disabled={working || !text.trim()}>
            {busy === 'validate' ? 'Checking...' : 'Check file'}
          </button>
          <button type="button" className="btn btn-primary" onClick={runScan} disabled={working || !text.trim()}>
            {busy === 'scan' ? 'Scanning...' : 'Run scan'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={clearAll} disabled={working || (!text && !message)}>Clear</button>
        </div>
        {message?.kind === 'error' && <ErrorBox error={{ message: message.text, details: message.details }} />}
        {message?.kind === 'success' && <div className="alert alert-ok" role="status">{message.text}</div>}
      </section>
    </>
  );
}
