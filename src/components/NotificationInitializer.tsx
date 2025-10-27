'use client';

import { useEffect } from 'react';
import { useAuthProfile } from '@/stores/authStore';
import {
  useNotificationActions,
  useNotifications,
} from '@/stores/notificationStore';
import { toast } from 'sonner';

/**
 * Component that initializes the notification system
 * Should be placed in the root layout to run once when the app loads
 * 
 * @example
 * ```tsx
 * // In layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <NotificationInitializer />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function NotificationInitializer() {
  const profile = useAuthProfile();
  const { subscribeToNotifications, unsubscribe, fetchNotifications } = useNotificationActions();
  const notifications = useNotifications();

  useEffect(() => {
    if (profile?.id) {
      // Initialize notification subscription
      subscribeToNotifications(profile.id);

      // Fetch existing notifications
      fetchNotifications();

      // Cleanup on unmount
      return () => {
        unsubscribe();
      };
    }
  }, [profile?.id, subscribeToNotifications, unsubscribe, fetchNotifications]);

  // Show toast for new unread notifications
  useEffect(() => {
    const unreadNotifications = notifications.filter(
      (notif) => !notif.is_read
    );

    if (unreadNotifications.length > 0) {
      const latest = unreadNotifications[0];
      
      // Check if this notification is very recent (last 5 seconds)
      const now = new Date();
      const created = new Date(latest.created_at);
      const diffInSeconds = (now.getTime() - created.getTime()) / 1000;

      if (diffInSeconds < 5) {
        toast.info(latest.title, {
          description: latest.message,
          action: latest.link
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = latest.link!;
                },
              }
            : undefined,
        });
      }
    }
  }, [notifications]);

  return null;
}

