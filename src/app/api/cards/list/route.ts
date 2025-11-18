import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { CardMetadata, CardCategory, Gender } from '@/types/canvas';
import { hasRole } from '@/lib/roleAuth';

const BUCKET_NAME = 'modes_cards';

const supabaseProjectUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

const PUBLIC_STORAGE_PREFIX = supabaseProjectUrl
  ? `${supabaseProjectUrl.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET_NAME}`
  : null;

function buildPublicUrl(path: string): string | undefined {
  if (!PUBLIC_STORAGE_PREFIX) {
    return undefined;
  }
  const normalizedPath = path.replace(/^\/+/, '');
  return `${PUBLIC_STORAGE_PREFIX}/${normalizedPath}`;
}

/**
 * GET /api/cards/list
 * 
 * Lists all card images for a category and gender
 * Returns array of card metadata (name, path, category, number extracted from filename)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<CardMetadata[] | { error: string }>> {
  try {
    const { authorized } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as CardCategory | null;
    const gender = searchParams.get('gender') as Gender | null;

    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Build path prefix based on category and gender
    let pathPrefix = `${category}/images/`;
    if (gender && category !== 'boat' && category !== 'wave') {
      pathPrefix += `${gender}/`;
    }

    // List files in the bucket
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(pathPrefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error('Error listing files:', error);
      return NextResponse.json(
        { error: 'Failed to list cards' },
        { status: 500 }
      );
    }

    // Filter and parse card metadata
    const cards: CardMetadata[] = (files || [])
      .filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png'))
      .map(file => {
        const fullPath = `${pathPrefix}${file.name}`;
        
        // Extract card number from filename
        // Format: Category_N_Description_Gender.jpg or similar
        const numberMatch = file.name.match(/_(\d+)_/);
        const cardNumber = numberMatch ? parseInt(numberMatch[1], 10) : 0;
        
        return {
          name: file.name,
          path: fullPath,
          category: category,
          cardNumber: cardNumber,
          gender: gender || undefined,
          publicUrl: buildPublicUrl(fullPath),
        };
      })
      .sort((a, b) => a.cardNumber - b.cardNumber);

    return NextResponse.json(cards, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('Error in cards/list route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching cards' },
      { status: 500 }
    );
  }
}

