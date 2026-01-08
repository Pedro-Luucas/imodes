import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getUserFromCookie } from '@/lib/auth';
import { sendNotificationMessage } from '@/lib/pgmq';
import type {
  GetNotificationsResponse,
  CreateNotificationRequest,
  CreateNotificationResponse
} from '@/types/notifications';

/**
 * GET /api/notifications
 * Fetch user's notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    const unreadCount = unreadOnly
      ? count || 0
      : notifications?.filter(n => !n.is_read).length || 0;

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      unread: unreadCount,
    } as GetNotificationsResponse);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification
 * Requires authentication and user_id in request body
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateNotificationRequest = await request.json();
    const { user_id, type, title, message, data, link } = body;

    // Validate required fields
    if (!user_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Enqueue message for async processing
    try {
      await sendNotificationMessage({
        user_id,
        type,
        title,
        message,
        data: data || {},
        link: link || null,
      });

      // Return 202 Accepted - message is queued and will be processed asynchronously
      // Note: We return a different response type when message is queued (no notification yet)
      return NextResponse.json(
        {
          message: 'Notification queued for processing',
          user_id,
        },
        { status: 202 }
      );
    } catch (queueError) {
      console.error('Error enqueueing notification message:', queueError);
      
      // Fallback: try direct creation if queue fails
      const supabase = createSupabaseServerClient();
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id,
          type,
          title,
          message,
          data: data || {},
          link: link || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification (fallback):', error);
        return NextResponse.json(
          { error: 'Failed to create notification' },
          { status: 500 }
        );
      }

      // Return success but log that queue failed
      console.warn('Queue failed, created notification directly as fallback');
      return NextResponse.json({
        message: 'Notification created successfully',
        notification,
      } as CreateNotificationResponse);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

