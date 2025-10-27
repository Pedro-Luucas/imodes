import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getUserFromCookie } from '@/lib/auth';
import type {
  MarkAllReadResponse
} from '@/types/notifications';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
// Remove the unused 'request' parameter or use it
export async function POST() {
  // Replace the function signature to remove the unused parameter
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Update all unread notifications for this user
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'All notifications marked as read',
      count: data?.length || 0,
    } as MarkAllReadResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

