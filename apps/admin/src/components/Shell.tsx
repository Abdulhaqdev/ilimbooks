import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, LANDING_URL } from '../lib/api';
import { useTheme } from '../lib/theme';
import { TimeProvider } from '../lib/time';
import {
  IconChart,
  IconDashboard,
  IconExternal,
  IconLayout,
  IconLogout,
  IconMegaphone,
  IconMenu,
  IconMoon,
  IconOrders,
  IconPlug,
  IconSettings,
  IconSparkles,
  IconSun,
} from './icons';
import AccountSwitcher from './AccountSwitcher';
import { TimeBar } from './TimeBar';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: <IconDashboard />, end: true },
  { to: '/landings', label: 'Landinglar', icon: <IconLayout /> },
  { to: '/templates', label: 'Shablonlar', icon: <IconSparkles /> },
  { to: '/orders', label: 'Buyurtmalar', icon: <IconOrders /> },
  { to: '/markets', label: 'Marketlar', icon: <IconPlug /> },
  { to: '/reklama', label: 'Reklama', icon: <IconMegaphone /> },
  { to: '/analytics', label: 'Analitika', icon: <IconChart /> },
  { to: '/settings', label: 'Sozlamalar', icon: <IconSettings /> },
];

export default function Shell() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const current =
    LINKS.find((l) => (l.end ? pathname === l.to : pathname.startsWith(l.to)))?.label ?? '';

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' });
    nav('/login');
  }

  return (
    <TimeProvider>
      <div className={open ? 'a-shell open' : 'a-shell'}>
        <aside className="a-side">
          <div className="a-brand">
            <div className="a-brand-mark">ib</div>
            <div>
              <div className="a-brand-name">ilimbooks</div>
              <div className="a-brand-sub">Admin panel</div>
            </div>
          </div>

          <div className="a-side-label">Menyu</div>
          <nav className="a-nav">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => (isActive ? 'on' : undefined)}
              >
                {l.icon}
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="a-side-foot">
            <button className="a-theme" type="button" onClick={toggle}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              <span>{theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}</span>
            </button>
            <a className="a-side-link" href={LANDING_URL} target="_blank" rel="noreferrer">
              <IconExternal />
              <span>Saytni ko‘rish</span>
            </a>
            <button className="a-side-link danger" type="button" onClick={logout}>
              <IconLogout />
              <span>Chiqish</span>
            </button>
          </div>
        </aside>

        <div className="a-backdrop" onClick={() => setOpen(false)} />

        <div className="a-content">
          <header className="a-top">
            <button
              className="a-burger"
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Menyuni ochish"
            >
              <IconMenu />
            </button>
            <div className="a-crumb">{current}</div>
            <AccountSwitcher />
            {pathname.startsWith('/templates') || pathname.startsWith('/markets') ? null : <TimeBar />}
          </header>
          <main className="a-main">
            <Outlet />
          </main>
        </div>
      </div>
    </TimeProvider>
  );
}
