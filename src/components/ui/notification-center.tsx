'use client';

import { useState } from 'react';
import { Bell, Check, X, ExternalLink, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  useNotifications,
  useUnreadCount,
  useNotificationLoading,
  useNotificationActions,
} from '@/stores/notificationStore';
import { AcceptRejectPatientDialog } from '@/components/dashboard/AcceptRejectPatientDialog';
import type { Notification } from '@/types/notifications';
import { NotificationType } from '@/types/notifications';
import { useRouter } from 'next/navigation';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const loading = useNotificationLoading();
  const { markAsRead, dismissNotification, markAllAsRead, fetchNotifications } = useNotificationActions();
  const router = useRouter();

  // Format time ago
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Handle therapist request notifications with dialog
    if (notification.type === NotificationType.THERAPIST_REQUEST && notification.data?.status === 'pending') {
      setSelectedNotification(notification);
      setDialogOpen(true);
      setOpen(false);
      return;
    }

    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link);
      setOpen(false);
    }
  };

  const handleDialogComplete = async () => {
    // Refresh notifications after accepting/rejecting
    await fetchNotifications();
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await dismissNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="icon" className={`relative ${className}`}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 border-stroke" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stroke">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs"
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        <div className="overflow-auto max-h-[400px] p-3">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  getTimeAgo={getTimeAgo}
                  onNotificationClick={handleNotificationClick}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>

    {selectedNotification && (
      <AcceptRejectPatientDialog
        notification={selectedNotification}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComplete={handleDialogComplete}
      />
    )}
    </>
  );
}

interface NotificationItemProps {
  notification: Notification;
  getTimeAgo: (date: string) => string;
  onNotificationClick: (notification: Notification) => void;
  onDismiss: (e: React.MouseEvent, id: string) => void;
}

function NotificationItem({
  notification,
  getTimeAgo,
  onNotificationClick,
  onDismiss,
}: NotificationItemProps) {
  const isTherapistRequest = notification.type === NotificationType.THERAPIST_REQUEST;
  const isPending = notification.data?.status === 'pending';
  const showActionButtons = isTherapistRequest && isPending;

  return (
    <div
      className={`rounded-lg border p-4 transition-all 
        bg-white border-stroke hover:shadow-sm'
      ${!showActionButtons ? 'cursor-pointer' : ''}`}
      onClick={() => !showActionButtons && onNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight">
              {notification.title}
            </h4>
            {!notification.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          {showActionButtons && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotificationClick(notification);
                }}
                className="flex-1"
              >
                <UserX className="w-3 h-3 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotificationClick(notification);
                }}
                className="flex-1"
              >
                <UserCheck className="w-3 h-3 mr-1" />
                Accept
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              {getTimeAgo(notification.created_at)}
            </span>
            {notification.link && !showActionButtons && (
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => onDismiss(e, notification.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

