import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { NotificationBanner } from '@/features/notifications/notification-banner';

/** Where tapping the banner leads. */
export type NotificationTarget =
  | { pathname: '/request/[id]'; params: { id: number } }
  | { pathname: '/task/[id]'; params: { id: number } };

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  target?: NotificationTarget;
};

type Notifications = {
  notify: (notification: Omit<AppNotification, 'id'>) => void;
};

const NotificationsContext = createContext<Notifications | null>(null);

/**
 * Mock "push" notifications: an in-app banner styled like a system one, fed by polling
 * (see `useRequestAlerts`). Shows one banner at a time; the rest wait in a queue.
 * TODO(backend): real push (Expo push tokens) once the backend can send events.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const nextId = useRef(1);

  const notify = useCallback((notification: Omit<AppNotification, 'id'>) => {
    const id = nextId.current++;
    setQueue((current) => [...current, { ...notification, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);
  const visible = queue[0];

  return (
    <NotificationsContext value={value}>
      {children}
      {visible && (
        <NotificationBanner key={visible.id} notification={visible} onDismiss={dismiss} />
      )}
    </NotificationsContext>
  );
}

export function useNotifications() {
  const notifications = use(NotificationsContext);
  if (!notifications) throw new Error('useNotifications must be used inside NotificationsProvider');
  return notifications;
}
