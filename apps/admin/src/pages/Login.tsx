import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMoon, IconSun } from '../components/icons';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';

export default function Login() {
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: fd.get('username'),
          password: fd.get('password'),
        }),
      });
      nav('/');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="a-login">
      <button className="a-theme a-login-theme" type="button" onClick={toggle}>
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
        <span>{theme === 'dark' ? 'Yorug‘' : 'Qorong‘i'}</span>
      </button>
      <div className="a-login-box">
        <div className="a-brand">
          <div className="a-brand-mark">ib</div>
          <div>
            <div className="a-brand-name">ilimbooks</div>
            <div className="a-brand-sub">Admin panel</div>
          </div>
        </div>
        <h1>Xush kelibsiz</h1>
        <p>Panelga kirish uchun login va parolni kiriting.</p>
        <form className="a-f" onSubmit={onSubmit}>
          <div>
            <label className="a-lbl" htmlFor="u">
              Login
            </label>
            <input className="a-in" id="u" name="username" autoComplete="username" required autoFocus />
          </div>
          <div>
            <label className="a-lbl" htmlFor="p">
              Parol
            </label>
            <input
              className="a-in"
              id="p"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="a-btn p" type="submit" disabled={loading}>
            {loading ? '…' : 'Kirish'}
          </button>
          {err ? <div className="a-err">{err}</div> : null}
        </form>
      </div>
    </div>
  );
}
