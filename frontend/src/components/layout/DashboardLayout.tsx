import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  PawPrint, LogOut, Menu, X, LayoutDashboard, CalendarDays, PawPrint as Paw, Syringe, CalendarPlus,
  User as UserIcon, Building2, Clock, Star, Stethoscope, Users, ShieldCheck, FileText, Siren, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';
import NotificationsBell from '@/components/NotificationsBell';

type Scope = 'owner' | 'clinic' | 'admin';
interface NavItem { to: string; label: string; icon: LucideIcon }

const NAV: Record<Scope, NavItem[]> = {
  owner: [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/animals', label: 'My Animals', icon: Paw },
    { to: '/app/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/app/vaccinations', label: 'Vaccinations', icon: Syringe },
    { to: '/app/book', label: 'Book', icon: CalendarPlus },
    { to: '/app/profile', label: 'Profile', icon: UserIcon },
  ],
  clinic: [
    { to: '/clinic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clinic/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/clinic/availability', label: 'Availability', icon: Clock },
    { to: '/clinic/reviews', label: 'Reviews', icon: Star },
    { to: '/clinic/veterinarians', label: 'Veterinarians', icon: Stethoscope },
    { to: '/clinic/profile', label: 'Clinic Profile', icon: Building2 },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/clinics', label: 'Clinics', icon: Building2 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/reviews', label: 'Reviews', icon: ShieldCheck },
    { to: '/admin/articles', label: 'Articles', icon: FileText },
    { to: '/admin/emergency', label: 'Emergency', icon: Siren },
  ],
};

const SCOPE_LABEL: Record<Scope, string> = { owner: 'Animal Owner', clinic: 'Clinic Admin', admin: 'Administrator' };

export default function DashboardLayout({ scope }: { scope: Scope }) {
  const items = NAV[scope];
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const initials = (user?.full_name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const SideNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end onClick={onNavigate}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive ? 'bg-brand-700 text-white shadow-card' : 'text-ink-soft hover:bg-brand-50 hover:text-brand-800')}>
          <Icon className="h-5 w-5 shrink-0" /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-sunken lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-black/[0.06] bg-white p-4 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white"><PawPrint className="h-5 w-5" /></span>
          <span className="font-display text-lg font-bold text-ink">VetConnect</span>
        </Link>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{SCOPE_LABEL[scope]}</p>
        <SideNav />
        <div className="mt-auto rounded-xl bg-surface-sunken p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user?.full_name}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary btn-sm mt-3 w-full"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-black/[0.06] bg-white/85 px-4 backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-xl text-ink-soft hover:bg-brand-50 lg:hidden"
              onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white"><PawPrint className="h-4 w-4" /></span>
              <span className="font-display font-bold text-ink">VetConnect</span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <span className="ml-1 hidden h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 sm:grid">{initials}</span>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-8"><Outlet /></main>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[82%] overflow-y-auto bg-white p-4 shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-ink">{SCOPE_LABEL[scope]}</span>
              <button onClick={() => setDrawer(false)} className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <SideNav onNavigate={() => setDrawer(false)} />
            <button onClick={handleLogout} className="btn-secondary btn-md mt-6 w-full"><LogOut className="h-4 w-4" /> Log out</button>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar (first 5 items) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/[0.06] bg-white/95 backdrop-blur-lg lg:hidden">
        {items.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
              isActive ? 'text-brand-700' : 'text-ink-muted')}>
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
