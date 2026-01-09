'use client';

import { useState, useEffect } from 'react';
import { CardMetadata, ParsedCardData, CardCategory, Gender } from '@/types/canvas';

export interface CardWithData extends CardMetadata {
  imageUrl?: string;
  name: string;
  description: string;
}

interface UseCardsDataResult {
  cards: CardWithData[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch cards for a category/gender/locale
 * Combines image list API and text parsing API
 * Returns matched cards with images and text data
 */
const CARDS_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const CACHE_VERSION = 'v3'; // Increment to bust cache after parser changes

const cardsCache = new Map<
  string,
  {
    timestamp: number;
    data: CardWithData[];
  }
>();

function getCacheKey(category: CardCategory, gender: Gender | undefined, locale: string) {
  return `${CACHE_VERSION}:${category}:${gender ?? 'all'}:${locale}`;
}

export function useCardsData(
  category: CardCategory,
  gender: Gender | undefined,
  locale: string
): UseCardsDataResult {
  const [cards, setCards] = useState<CardWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = getCacheKey(category, gender, locale);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    async function fetchCards() {
      if (!category) return;

      const cached = cardsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CARDS_CACHE_TTL_MS) {
        setCards(cached.data);
        setLoading(false);
        return;
      }

      // Delay fetching cards to prioritize canvas images loading first
      // This gives canvas images time to load before competing for bandwidth
      await new Promise(resolve => {
        timeoutId = setTimeout(resolve, 300); // 300ms delay
      });

      if (cancelled) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch card images list
        const categoryParam = encodeURIComponent(category);
        const genderParam = gender ? encodeURIComponent(gender) : '';
        
        let listUrl = `/api/cards/list?category=${categoryParam}`;
        if (gender && category !== 'boat' && category !== 'wave') {
          listUrl += `&gender=${genderParam}`;
        }

        const listResponse = await fetch(listUrl);
        if (!listResponse.ok) {
          throw new Error('Failed to fetch card list');
        }
        const cardList: CardMetadata[] = await listResponse.json();

        // Fetch card text data
        const textResponse = await fetch(`/api/cards/text/${category}/${locale}`);
        if (!textResponse.ok) {
          throw new Error('Failed to fetch card text');
        }
        const cardTexts: ParsedCardData[] = await textResponse.json();

        // Fetch signed URLs for images and match with text data
        const cardsWithData: CardWithData[] = await Promise.all(
          cardList.map(async (cardMeta) => {
            let imageUrl: string | undefined = cardMeta.publicUrl;
            if (!imageUrl) {
              const imageResponse = await fetch(`/api/cards/image?path=${encodeURIComponent(cardMeta.path)}`);
              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                imageUrl = imageData.signed_url;
              }
            }

            // Match card metadata with text data by number
            const textData = cardTexts.find(t => t.number === cardMeta.cardNumber);

            return {
              ...cardMeta,
              imageUrl,
              name: textData?.name || cardMeta.name,
              description: textData?.description || '',
            };
          })
        );

        if (!cancelled) {
          setCards(cardsWithData);
          setLoading(false);
          cardsCache.set(cacheKey, { data: cardsWithData, timestamp: Date.now() });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cards');
          setLoading(false);
        }
      }
    }

    fetchCards();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [category, gender, locale, cacheKey]);

  return { cards, loading, error };
}

