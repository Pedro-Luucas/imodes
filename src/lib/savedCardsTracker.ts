'use client';

import { CardCategory } from '@/types/canvas';
import { sanitizeStorageUrl } from './urlSanitizer';

export interface SavedCard {
  cardNumber: number;
  category: CardCategory;
  imageUrl?: string;
  title: string;
  description: string;
  savedAt: number; // timestamp
}

const STORAGE_KEY = 'saved_cards';

/**
 * Save a card to the saved cards folder
 */
export function saveCard(card: {
  cardNumber: number;
  category: CardCategory;
  imageUrl?: string;
  title: string;
  description: string;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const savedCardsMap: Map<string, SavedCard> = stored
      ? new Map(JSON.parse(stored))
      : new Map();

    const key = `${card.category}-${card.cardNumber}`;
    
    // Sanitize the URL to ensure it's a public (non-expiring) URL
    const sanitizedImageUrl = sanitizeStorageUrl(card.imageUrl);
    
    // Add or update the saved card
    savedCardsMap.set(key, {
      cardNumber: card.cardNumber,
      category: card.category,
      imageUrl: sanitizedImageUrl,
      title: card.title,
      description: card.description,
      savedAt: Date.now(),
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(savedCardsMap.entries())));
    
    // Dispatch custom event to notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('savedCardsUpdated'));
    }
  } catch (error) {
    console.error('Failed to save card:', error);
  }
}

/**
 * Get all saved cards, sorted by saved date (newest first)
 * Also sanitizes URLs to fix any previously stored expired signed URLs
 */
export function getSavedCards(): SavedCard[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const savedCardsMap: Map<string, SavedCard> = new Map(JSON.parse(stored));
    const cards = Array.from(savedCardsMap.values())
      .map(card => ({
        ...card,
        // Sanitize URL to fix any expired signed URLs
        imageUrl: sanitizeStorageUrl(card.imageUrl),
      }))
      .sort((a, b) => b.savedAt - a.savedAt); // Newest first

    return cards;
  } catch (error) {
    console.error('Failed to get saved cards:', error);
    return [];
  }
}

/**
 * Remove a card from saved cards
 */
export function removeSavedCard(cardNumber: number, category: CardCategory): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const savedCardsMap: Map<string, SavedCard> = new Map(JSON.parse(stored));
    const key = `${category}-${cardNumber}`;
    savedCardsMap.delete(key);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(savedCardsMap.entries())));
    
    // Dispatch custom event to notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('savedCardsUpdated'));
    }
  } catch (error) {
    console.error('Failed to remove saved card:', error);
  }
}

/**
 * Check if a card is saved
 */
export function isCardSaved(cardNumber: number, category: CardCategory): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const savedCardsMap: Map<string, SavedCard> = new Map(JSON.parse(stored));
    const key = `${category}-${cardNumber}`;
    return savedCardsMap.has(key);
  } catch (error) {
    console.error('Failed to check if card is saved:', error);
    return false;
  }
}

/**
 * Clear all saved cards
 */
export function clearSavedCards(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

