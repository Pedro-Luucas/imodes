'use client';

import { CardCategory } from '@/types/canvas';
import { sanitizeStorageUrl } from './urlSanitizer';

export interface CardUsage {
  cardNumber: number;
  category: CardCategory;
  imageUrl?: string;
  title: string;
  description: string;
  usageCount: number;
  lastUsed: number; // timestamp
}

const STORAGE_KEY = 'frequently_used_cards';
const MAX_TRACKED_CARDS = 20; // Maximum number of cards to track
const MAX_DISPLAYED_CARDS = 12; // Maximum number of cards to display

/**
 * Track a card as being used
 */
export function trackCardUsage(card: {
  cardNumber: number;
  category: CardCategory;
  imageUrl?: string;
  title: string;
  description: string;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const usageMap: Map<string, CardUsage> = stored
      ? new Map(JSON.parse(stored))
      : new Map();

    const key = `${card.category}-${card.cardNumber}`;
    const existing = usageMap.get(key);

    // Sanitize the URL to ensure it's a public (non-expiring) URL
    const sanitizedImageUrl = sanitizeStorageUrl(card.imageUrl);

    if (existing) {
      // Update existing entry
      existing.usageCount += 1;
      existing.lastUsed = Date.now();
      existing.imageUrl = sanitizedImageUrl || sanitizeStorageUrl(existing.imageUrl);
      existing.title = card.title;
      existing.description = card.description;
    } else {
      // Create new entry
      usageMap.set(key, {
        cardNumber: card.cardNumber,
        category: card.category,
        imageUrl: sanitizedImageUrl,
        title: card.title,
        description: card.description,
        usageCount: 1,
        lastUsed: Date.now(),
      });
    }

    // Keep only the most frequently used cards
    const sortedEntries = Array.from(usageMap.entries())
      .sort((a, b) => {
        // Sort by usage count (descending), then by last used (descending)
        if (b[1].usageCount !== a[1].usageCount) {
          return b[1].usageCount - a[1].usageCount;
        }
        return b[1].lastUsed - a[1].lastUsed;
      })
      .slice(0, MAX_TRACKED_CARDS);

    const trimmedMap = new Map(sortedEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(trimmedMap.entries())));
    
    // Dispatch custom event to notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cardUsageUpdated'));
    }
  } catch (error) {
    console.error('Failed to track card usage:', error);
  }
}

/**
 * Get frequently used cards, sorted by usage count and last used
 * Also sanitizes URLs to fix any previously stored expired signed URLs
 */
export function getFrequentlyUsedCards(): CardUsage[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const usageMap: Map<string, CardUsage> = new Map(JSON.parse(stored));
    const cards = Array.from(usageMap.values())
      .map(card => ({
        ...card,
        // Sanitize URL to fix any expired signed URLs
        imageUrl: sanitizeStorageUrl(card.imageUrl),
      }))
      .sort((a, b) => {
        // Sort by usage count (descending), then by last used (descending)
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return b.lastUsed - a.lastUsed;
      })
      .slice(0, MAX_DISPLAYED_CARDS);

    return cards;
  } catch (error) {
    console.error('Failed to get frequently used cards:', error);
    return [];
  }
}

/**
 * Clear all tracked card usage
 */
export function clearCardUsage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

