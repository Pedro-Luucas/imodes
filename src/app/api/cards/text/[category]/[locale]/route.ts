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
    // Cards text API is public - no authentication required
    // This allows demo sessions and regular sessions to access card text

    const { category, locale } = await context.params;

    // Validate locale - support en, pt, nl, it
    // If locale not supported, fallback to 'en'
    const supportedLocales = ['en', 'pt', 'nl', 'it'];
    const validLocale = supportedLocales.includes(locale) ? locale : 'en';

    // Build text file path based on category
    // All categories use the same simple structure: {category}/text/{locale}.txt
    const normalizedCategory = category.toLowerCase();

    if (normalizedCategory === 'boat' || normalizedCategory === 'wave') {
      textPath = `${normalizedCategory}/text/${locale}.txt`;
    } else {
      textPath = `${normalizedCategory}/text/${locale}.txt`;
    }

    const supabase = createSupabaseServerClient();

    // Download text file - try requested locale first, fallback to 'en' if not found
    let data, error;
    ({ data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(textPath));

    // If file not found and locale is not 'en', try fallback to 'en'
    if (error && validLocale !== 'en') {
      const fallbackPath = normalizedCategory === 'boat' || normalizedCategory === 'wave'
        ? `${normalizedCategory}/text/en.txt`
        : `${normalizedCategory}/text/en.txt`;
      
      ({ data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(fallbackPath));
    }

    if (error || !data) {
      console.error('Error downloading text file:', error);
      console.error('Path attempted:', textPath);
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

