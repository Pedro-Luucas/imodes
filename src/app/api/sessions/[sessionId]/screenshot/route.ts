import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import { uploadFile, listFiles } from '@/lib/s3Client';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type ErrorResponse = {
  error: string;
};

type ScreenshotResponse = {
  url: string;
  filename: string;
};

const BUCKET_NAME = 'session_screenshots';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/sessions/[sessionId]/screenshot
 * 
 * Uploads a screenshot of the canvas for the session
 * Names files with crescent numbers: {sessionId}/1.png, {sessionId}/2.png, etc.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ScreenshotResponse | ErrorResponse>> {
  try {
    const { sessionId } = await context.params;

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Verify session exists and user has access
    const { data: session, error: sessionError } = await supabase
      .from('imodes_session')
      .select('id, patient_id, therapist_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify access permissions
    const sessionPatientId = String(session.patient_id || '');
    const sessionTherapistId = String(session.therapist_id || '');
    const profileId = String(profile.id || '');

    if (profile.role === 'patient') {
      if (sessionPatientId !== profileId) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only take screenshots of your own sessions' },
          { status: 403 }
        );
      }
    } else if (profile.role === 'therapist') {
      if (sessionTherapistId !== profileId) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only take screenshots of sessions where you are the therapist' },
          { status: 403 }
        );
      }
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('screenshot') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No screenshot provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Get extension from mime type
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const extension = mimeToExt[file.type] || 'png';

    // List existing screenshots to determine next number
    const prefix = `${sessionId}/`;
    const existingFiles = await listFiles(BUCKET_NAME, prefix);
    
    // Extract numbers from existing filenames and find the max
    const existingNumbers = existingFiles
      .map((key) => {
        const filename = key.replace(prefix, '');
        const match = filename.match(/^(\d+)\./);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const filename = `${nextNumber}.${extension}`;
    const fullKey = `${sessionId}/${filename}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to storage
    await uploadFile(BUCKET_NAME, fullKey, fileBuffer, file.type);

    // Construct public URL
    const supabaseUrl = process.env.SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fullKey}`;

    return NextResponse.json(
      {
        url: publicUrl,
        filename: filename,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while uploading screenshot' },
      { status: 500 }
    );
  }
}

