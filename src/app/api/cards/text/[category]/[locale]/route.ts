import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { parseCardText } from '@/lib/cardParser';
import { ParsedCardData } from '@/types/canvas';
import { hasRole } from '@/lib/roleAuth';

const BUCKET_NAME = 'modes_cards';

interface RouteContext {
  params: Promise<{ category: string; locale: string }>;
}

/**
 * GET /api/cards/text/[category]/[locale]
 * 
 * Fetches and parses text file for a category/locale
 * Returns structured card data with number, name, description
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ParsedCardData[] | { error: string }>> {
  try {
    const { authorized } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    const { category, locale } = await context.params;

    // Validate locale
    if (!['en', 'pt'].includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be "en" or "pt"' },
        { status: 400 }
      );
    }

    // Build text file path based on category
    let textPath: string;
    const normalizedCategory = category.toLowerCase();

    if (normalizedCategory === 'boat' || normalizedCategory === 'wave') {
      textPath = `${normalizedCategory}/text/${locale}.txt`;
    } else {
      textPath = `${normalizedCategory}/text/${locale}.txt`;
    }

    const supabase = createSupabaseServerClient();

    // Download text file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(textPath);

    if (error) {
      console.error('Error downloading text file:', error);
      return NextResponse.json(
        { error: 'Failed to fetch card text file' },
        { status: 500 }
      );
    }

    // Convert blob to text
    const text = await data.text();

    // Parse text file
    const cards = parseCardText(text);

    return NextResponse.json(cards, { status: 200 });
  } catch (error) {
    console.error('Error in cards/text route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while parsing card text' },
      { status: 500 }
    );
  }
}

