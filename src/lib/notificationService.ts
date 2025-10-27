/**
 * Notification service helper functions
 * Provides utilities for creating and managing notifications
 */

import type {
  NotificationType,
  CreateNotificationRequest,
} from '@/types/notifications';

/**
 * Create a notification
 * This function can be called from anywhere in the application
 * 
 * @example
 * ```ts
 * await createNotification({
 *   user_id: patientId,
 *   type: NotificationType.ASSIGNMENT_CREATED,
 *   title: 'New Assignment',
 *   message: 'Your therapist has assigned you a new task',
 *   data: { assignment_id: assignmentId },
 *   link: `/dashboard-patient`
 * });
 * ```
 */
export async function createNotification(
  notification: Omit<CreateNotificationRequest, 'user_id' | 'type' | 'title'> & {
    user_id: string;
    type: NotificationType | string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    link?: string;
  }
): Promise<void> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create notification');
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Notification templates for common use cases
 */
export const NotificationTemplates = {
  /**
   * Template for when an assignment is created
   */
  assignmentCreated: (patientId: string, assignmentId: string, assignmentName: string) => ({
    user_id: patientId,
    type: 'assignment_created' as NotificationType,
    title: 'New Assignment',
    message: `Your therapist has created a new assignment: ${assignmentName}`,
    data: { assignment_id: assignmentId },
    link: `/dashboard-patient`,
  }),

  /**
   * Template for when an assignment is due soon
   */
  assignmentDue: (patientId: string, assignmentId: string, assignmentName: string) => ({
    user_id: patientId,
    type: 'assignment_due' as NotificationType,
    title: 'Assignment Due Soon',
    message: `Your assignment "${assignmentName}" is due soon`,
    data: { assignment_id: assignmentId },
    link: `/dashboard-patient`,
  }),

  /**
   * Template for when a therapist is assigned to a patient
   */
  therapistAssigned: (patientId: string, therapistId: string, therapistName: string) => ({
    user_id: patientId,
    type: 'therapist_assigned' as NotificationType,
    title: 'New Therapist Assigned',
    message: `${therapistName} has been assigned as your therapist`,
    data: { therapist_id: therapistId },
    link: `/my-therapist`,
  }),

  /**
   * Template for when a therapist is unassigned from a patient
   */
  therapistUnassigned: (patientId: string) => ({
    user_id: patientId,
    type: 'therapist_unassigned' as NotificationType,
    title: 'Therapist Unassigned',
    message: 'Your therapist has been unassigned',
    data: {},
    link: `/my-therapist`,
  }),

  /**
   * Template for when a new patient is assigned to a therapist
   */
  newPatient: (therapistId: string, patientId: string, patientName: string) => ({
    user_id: therapistId,
    type: 'new_patient' as NotificationType,
    title: 'New Patient',
    message: `${patientName} has been assigned to you`,
    data: { patient_id: patientId },
    link: `/dashboard/patients`,
  }),

  /**
   * Template for when a patient is assigned to a therapist
   */
  patientAssigned: (therapistId: string, patientId: string, patientName: string) => ({
    user_id: therapistId,
    type: 'patient_assigned' as NotificationType,
    title: 'Patient Assigned',
    message: `${patientName} is now one of your patients`,
    data: { patient_id: patientId },
    link: `/dashboard/patients`,
  }),

  /**
   * Template for system updates
   */
  systemUpdate: (userId: string, message: string) => ({
    user_id: userId,
    type: 'system_update' as NotificationType,
    title: 'System Update',
    message,
    data: {},
    link: null,
  }),

  /**
   * Template for profile updates
   */
  profileUpdate: (userId: string) => ({
    user_id: userId,
    type: 'profile_update' as NotificationType,
    title: 'Profile Updated',
    message: 'Your profile has been successfully updated',
    data: {},
    link: `/profile`,
  }),

  /**
   * Template for when an assignment is completed
   */
  assignmentCompleted: (therapistId: string, patientId: string, assignmentId: string, assignmentName: string) => ({
    user_id: therapistId,
    type: 'assignment_completed' as NotificationType,
    title: 'Assignment Completed',
    message: `A patient has completed the assignment: ${assignmentName}`,
    data: { assignment_id: assignmentId, patient_id: patientId },
    link: `/dashboard/patients`,
  }),
};

/**
 * Helper function to show a toast notification
 * This should be used client-side to display notifications
 */
export function showNotificationToast(
  title: string,
  message: string,
  variant: 'default' | 'success' | 'error' | 'warning' = 'default'
): void {
  // This will be dynamically imported on the client side
  if (typeof window !== 'undefined') {
    import('sonner').then(({ toast }) => {
      toast[variant === 'success' ? 'success' : variant === 'error' ? 'error' : 'info'](
        title,
        { description: message }
      );
    });
  }
}

