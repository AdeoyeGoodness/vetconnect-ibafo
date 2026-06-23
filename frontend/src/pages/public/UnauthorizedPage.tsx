import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, LogIn, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui';

const dashboardPath = (role?: string) =>
  role === 'SUPER_ADMIN' ? '/admin/dashboard' : role === 'CLINIC_ADMIN' ? '/clinic/dashboard' : '/app/dashboard';

export default function UnauthorizedPage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="grid min-h-[70vh] place-items-center bg-surface-sunken px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <p className="mt-6 font-display text-5xl font-extrabold text-rose-600">403</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Access denied</h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-muted">
          You don't have permission to view this page. If you think this is a mistake, please sign in
          with the right account.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Link to={dashboardPath(user?.role)}>
              <Button icon={<Home className="h-5 w-5" />} className="w-full sm:w-auto">Go to dashboard</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button icon={<LogIn className="h-5 w-5" />} className="w-full sm:w-auto">Sign in</Button>
            </Link>
          )}
          <Link to="/">
            <Button variant="secondary" icon={<Home className="h-5 w-5" />} className="w-full sm:w-auto">
              Back home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
