import type { CanvasState, CanvasCard, Gender } from '@/types/canvas';

/**
 * Serialize canvas state to JSON format for storage
 * Ensures all card properties including width and height are included
 */
export function serializeCanvasState(
  cards: CanvasCard[],
  gender: Gender,
  patientZoomLevel: number,
  therapistZoomLevel: number
): CanvasState {
  // Ensure all cards have width and height explicitly set
  const serializedCards: CanvasCard[] = cards.map((card) => ({
    ...card,
    width: typeof card.width === 'number' && card.width > 0 ? card.width : 280,
    height: typeof card.height === 'number' && card.height > 0 ? card.height : 320,
  }));

  return {
    cards: serializedCards,
    gender,
    patientSettings: {
      zoomLevel: patientZoomLevel,
    },
    therapistSettings: {
      zoomLevel: therapistZoomLevel,
    },
  };
}

/**
 * Deserialize canvas state from JSON format
 * Returns default values if data is missing or invalid
 * Ensures all card properties including width and height are preserved
 */
export function deserializeCanvasState(data: CanvasState | null): {
  cards: CanvasCard[];
  gender: Gender;
  patientZoomLevel: number;
  therapistZoomLevel: number;
} {
  if (!data) {
    return {
      cards: [],
      gender: 'male',
      patientZoomLevel: 100,
      therapistZoomLevel: 100,
    };
  }

  // Ensure cards have all required properties, especially width and height
  const cards: CanvasCard[] = Array.isArray(data.cards)
    ? data.cards.map((card: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: String(card?.id || ''),
        x: typeof card?.x === 'number' ? card.x : 0,
        y: typeof card?.y === 'number' ? card.y : 0,
        title: String(card?.title || ''),
        description: String(card?.description || ''),
        color: String(card?.color || '#0ea5e9'),
        width: typeof card?.width === 'number' && card.width > 0 ? card.width : 280,
        height: typeof card?.height === 'number' && card.height > 0 ? card.height : 320,
        rotation: typeof card?.rotation === 'number' ? card.rotation : 0,
        imageUrl: card?.imageUrl ? String(card.imageUrl) : undefined,
        category: card?.category,
        cardNumber: card?.cardNumber,
        gender: card?.gender,
        locked: Boolean(card?.locked || false),
      }))
    : [];

  return {
    cards,
    gender: data.gender === 'female' ? 'female' : 'male',
    patientZoomLevel: data.patientSettings?.zoomLevel ?? 100,
    therapistZoomLevel: data.therapistSettings?.zoomLevel ?? 100,
  };
}

