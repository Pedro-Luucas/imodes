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
export function useCardsData(
  category: CardCategory,
  gender: Gender | undefined,
  locale: string
): UseCardsDataResult {
  const [cards, setCards] = useState<CardWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    async function fetchCards() {
      if (!category) return;

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
            // Get signed URL for image
            const imageResponse = await fetch(`/api/cards/image?path=${encodeURIComponent(cardMeta.path)}`);
            let imageUrl: string | undefined;
            
            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              imageUrl = imageData.signed_url;
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
  }, [category, gender, locale]);

  return { cards, loading, error };
}

