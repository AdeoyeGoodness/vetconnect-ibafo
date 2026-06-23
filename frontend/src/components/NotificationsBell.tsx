import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { unwrap, api } from '@/lib/api';

/** Bell with unread badge. Polls the unread-count endpoint. */
export default function NotificationsBell() {
  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      unwrap<{ count: number }>(api.get('/notifications/unread-count'))
        .then((d) => d?.count ?? 0)
        .catch(() => 0),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <button
      type="button"
      aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
      className="relative grid h-11 w-11 place-items-center rounded-xl text-ink-soft transition hover:bg-brand-50 hover:text-brand-800"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
