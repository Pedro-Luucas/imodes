'use client';

import { create } from 'zustand';
import type {
  NotificationState,
  NotificationActions,
  GetNotificationsResponse,
  MarkNotificationReadResponse,
} from '@/types/notifications';

/**
 * Internal Zustand store
 */
const useNotificationStore = create<NotificationState & { actions: NotificationActions }>((set, get) => {
  let eventSource: EventSource | null = null;

  return {
    // Initial state
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,

    // Actions object - stable reference
    actions: {
      fetchNotifications: async (options = {}) => {
        const { limit = 50, offset = 0, unreadOnly = false } = options;

        set({ loading: true, error: null });

        try {
          const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            unreadOnly: unreadOnly.toString(),
          });

          const response = await fetch(`/api/notifications?${params.toString()}`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch notifications');
          }

          const data: GetNotificationsResponse = await response.json();

          set({
            notifications: data.notifications,
            unreadCount: data.unread,
            loading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },

      subscribeToNotifications: () => {
        // Close existing connection if any
        if (eventSource) {
          eventSource.close();
        }

        // Create new EventSource connection to our SSE endpoint
        eventSource = new EventSource('/api/notifications/stream');

        eventSource.onopen = () => {
          console.log('Notification stream connected');
        };

        eventSource.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'connected') {
              console.log('SSE connection established');
              return;
            }

            if (data.type === 'notification') {
              // Refetch notifications when we receive an update
              await get().actions.fetchNotifications();
            }

            if (data.type === 'error') {
              console.error('SSE error from server:', data.message || 'Unknown error');
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = () => {
          // EventSource error event doesn't provide detailed error info (it's just an empty object {})
          // The error event fires during normal reconnection attempts, so we don't log it
          // to avoid noise in the console. Actual errors from the server are handled via
          // the onmessage handler when data.type === 'error'
          
          // Check readyState to understand the connection status:
          // 0 = CONNECTING (reconnecting), 1 = OPEN (connected), 2 = CLOSED (failed)
          // EventSource automatically handles reconnection for CONNECTING state
          
          // Only manually intervene if the connection is truly closed and won't reconnect
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            // Connection was closed and may need manual reconnection
            // Try to reconnect after a delay
            setTimeout(() => {
              // Only reconnect if the connection is still closed
              // (avoid reconnecting if it already reconnected)
              if (eventSource && eventSource.readyState === EventSource.CLOSED) {
                console.warn('SSE connection failed. Attempting to reconnect...');
                get().actions.subscribeToNotifications();
              }
            }, 3000);
          }
        };
      },

      unsubscribe: () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      },

      markAsRead: async (id: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(`/api/notifications/${id}`, {
            method: 'PATCH',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to mark notification as read');
          }

          const data: MarkNotificationReadResponse = await response.json();

          // Update local state
          const { notifications } = get();
          const updatedNotifications = notifications.map((notif) =>
            notif.id === id ? data.notification : notif
          );

          const unreadCount = updatedNotifications.filter((n) => !n.is_read).length;

          set({
            notifications: updatedNotifications,
            unreadCount,
            loading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },

      markAllAsRead: async () => {
        set({ loading: true, error: null });

        try {
          const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to mark all notifications as read');
          }


          // Update local state
          const { notifications } = get();
          const updatedNotifications = notifications.map((notif) => ({
            ...notif,
            is_read: true,
            read_at: new Date().toISOString(),
          }));

          set({
            notifications: updatedNotifications,
            unreadCount: 0,
            loading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },

      dismissNotification: async (id: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(`/api/notifications/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to dismiss notification');
          }


          // Update local state
          const { notifications } = get();
          const filteredNotifications = notifications.filter((notif) => notif.id !== id);
          const unreadCount = filteredNotifications.filter((n) => !n.is_read).length;

          set({
            notifications: filteredNotifications,
            unreadCount,
            loading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },
    },
  };
});

/**
 * Atomic selector hooks
 */

export const useNotifications = () => useNotificationStore((state) => state.notifications);

export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);

export const useNotificationLoading = () => useNotificationStore((state) => state.loading);

export const useNotificationError = () => useNotificationStore((state) => state.error);

export const useNotificationActions = () => useNotificationStore((state) => state.actions);

