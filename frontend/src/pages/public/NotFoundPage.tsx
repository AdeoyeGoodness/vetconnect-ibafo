import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-surface-sunken px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <PawPrint className="h-8 w-8" />
        </span>
        <p className="mt-6 font-display text-6xl font-extrabold text-brand-700">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-muted">
          The page you're looking for has wandered off. Let's get you back on track.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button icon={<Home className="h-5 w-5" />} className="w-full sm:w-auto">Back home</Button>
          </Link>
          <Link to="/directory">
            <Button variant="secondary" icon={<Search className="h-5 w-5" />} className="w-full sm:w-auto">
              Browse clinics
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
