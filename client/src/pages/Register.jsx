import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ErrorBox } from '../components/Feedback.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError({ message: 'The two passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <p className="muted">Your scans and findings are private to your account.</p>
        {error && <ErrorBox error={error} />}
        <label>
          Name
          <input value={form.name} onChange={set('name')} required minLength={2} maxLength={60} autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
          <span className="hint">At least 8 characters, with a letter and a number.</span>
        </label>
        <label>
          Confirm password
          <input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
        <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
