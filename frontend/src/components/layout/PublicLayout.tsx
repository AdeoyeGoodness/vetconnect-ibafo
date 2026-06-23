import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Menu, X, Siren, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';
import Footer from './Footer';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/directory', label: 'Directory' },
  { to: '/info', label: 'Information' },
];

const dashboardPath = (role?: string) =>
  role === 'SUPER_ADMIN' ? '/admin/dashboard' : role === 'CLINIC_ADMIN' ? '/clinic/dashboard' : '/app/dashboard';

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); setOpen(false); navigate('/'); };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-lg">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-ink">VetConnect</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'text-brand-800 bg-brand-50' : 'text-ink-soft hover:text-brand-800 hover:bg-brand-50')}>
                {n.label}
              </NavLink>
            ))}
            <Link to="/emergency" className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-rose-50">
              <Siren className="h-4 w-4" /> Emergency
            </Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Link to={dashboardPath(user?.role)} className="btn-secondary btn-sm">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button onClick={handleLogout} className="btn-ghost btn-sm" aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm">Log in</Link>
                <Link to="/register" className="btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>

          <button className="grid h-11 w-11 place-items-center rounded-xl text-ink-soft hover:bg-brand-50 md:hidden"
            onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-black/[0.06] bg-white md:hidden">
              <nav className="container-app flex flex-col gap-1 py-3">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
                    className={({ isActive }) => cn('rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft')}>
                    {n.label}
                  </NavLink>
                ))}
                <Link to="/emergency" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-danger">
                  <Siren className="h-4 w-4" /> Emergency Assistance
                </Link>
                <div className="my-2 h-px bg-black/[0.06]" />
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath(user?.role)} onClick={() => setOpen(false)} className="btn-primary btn-md">Go to dashboard</Link>
                    <button onClick={handleLogout} className="btn-secondary btn-md mt-2">Log out</button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary btn-md flex-1">Log in</Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="btn-primary btn-md flex-1">Get started</Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
