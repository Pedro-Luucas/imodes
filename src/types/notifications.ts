/**
 * Type definitions for notification system
 */

/**
 * Notification types/categories
 */
export enum NotificationType {
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_DUE = 'assignment_due',
  NEW_PATIENT = 'new_patient',
  PATIENT_ASSIGNED = 'patient_assigned',
  THERAPIST_ASSIGNED = 'therapist_assigned',
  THERAPIST_UNASSIGNED = 'therapist_unassigned',
  SYSTEM_UPDATE = 'system_update',
  PROFILE_UPDATE = 'profile_update',
  ASSIGNMENT_COMPLETED = 'assignment_completed',
  THERAPIST_REQUEST = 'therapist_request',
  THERAPIST_REQUEST_ACCEPTED = 'therapist_request_accepted',
  THERAPIST_REQUEST_REJECTED = 'therapist_request_rejected',
}

/**
 * Notification data metadata structure
 */
export interface NotificationData {
  assignment_id?: string;
  patient_id?: string;
  therapist_id?: string;
  patient_name?: string;
  therapist_name?: string;
  request_id?: string;
  [key: string]: unknown;
}

/**
 * Notification interface matching database schema
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  data: NotificationData;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * API Request/Response types
 */

export interface CreateNotificationRequest {
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  data?: NotificationData;
  link?: string;
}

export interface CreateNotificationResponse {
  message: string;
  notification: Notification;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

export interface MarkNotificationReadResponse {
  message: string;
  notification: Notification;
}

export interface MarkAllReadResponse {
  message: string;
  count: number;
}

export interface DismissNotificationResponse {
  message: string;
}

/**
 * Notification store state
 */
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Notification store actions
 */
export interface NotificationActions {
  fetchNotifications: (options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) => Promise<void>;
  subscribeToNotifications: () => void;
  unsubscribe: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

