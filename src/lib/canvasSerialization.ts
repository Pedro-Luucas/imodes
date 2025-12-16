import type {
  CanvasState,
  CanvasCard,
  Gender,
  PostItNote,
  TherapistSettings,
} from '@/types/canvas';

/**
 * Serialize canvas state to JSON format for storage
 * Ensures all card properties including width and height are included
 */
export interface SerializeCanvasStateOptions {
  cards: CanvasCard[];
  notes: PostItNote[];
  gender: Gender;
  patientZoomLevel: number;
  therapistZoomLevel: number;
  therapistNotes?: string;
  version?: number;
  updatedAt?: string;
}

export function serializeCanvasState({
  cards,
  notes,
  gender,
  patientZoomLevel,
  therapistZoomLevel,
  therapistNotes,
  version,
  updatedAt,
}: SerializeCanvasStateOptions): CanvasState {
  // Ensure all cards have width and height explicitly set
  const serializedCards: CanvasCard[] = cards.map((card) => ({
    ...card,
    width: typeof card.width === 'number' && card.width > 0 ? card.width : 280,
    height: typeof card.height === 'number' && card.height > 0 ? card.height : 320,
  }));

  const therapistSettings: TherapistSettings = {
    zoomLevel: therapistZoomLevel,
  };
  
  if (therapistNotes !== undefined) {
    therapistSettings.notes = therapistNotes;
  }

  return {
    cards: serializedCards,
    notes: notes.map((note) => ({
      ...note,
      width: typeof note.width === 'number' && note.width > 0 ? note.width : 142,
      height: typeof note.height === 'number' && note.height > 0 ? note.height : 100,
    })),
    gender,
    patientSettings: {
      zoomLevel: patientZoomLevel,
    },
    therapistSettings,
    version,
    updatedAt,
  };
}

/**
 * Deserialize canvas state from JSON format
 * Returns default values if data is missing or invalid
 * Ensures all card properties including width and height are preserved
 */
export interface DeserializedCanvasState {
  cards: CanvasCard[];
  notes: PostItNote[];
  gender: Gender;
  patientZoomLevel: number;
  therapistZoomLevel: number;
  therapistNotes?: string;
  version?: number;
  updatedAt?: string;
}

export function deserializeCanvasState(data: CanvasState | null): DeserializedCanvasState {
  // Default zoom is 60% actual which displays as 100% (with +40 offset)
  if (!data) {
    return {
      cards: [],
      notes: [],
      gender: 'male',
      patientZoomLevel: 60,
      therapistZoomLevel: 60,
    };
  }

  // Ensure cards have all required properties, especially width and height
  const cards: CanvasCard[] = Array.isArray(data.cards)
    ? data.cards.map((card) => ({
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

  const rawNotes = Array.isArray(data.notes) ? data.notes : [];
  const notes: PostItNote[] = rawNotes.map((note) => ({
    id: String(note?.id || ''),
    x: typeof note?.x === 'number' ? note.x : 0,
    y: typeof note?.y === 'number' ? note.y : 0,
    text: typeof note?.text === 'string' ? note.text : '',
    width: typeof note?.width === 'number' && note.width > 0 ? note.width : 142,
    height: typeof note?.height === 'number' && note.height > 0 ? note.height : 100,
    isEditing: Boolean(note?.isEditing || false),
  }));

  return {
    cards,
    notes,
    gender: data.gender === 'female' ? 'female' : 'male',
    // Default zoom is 60% actual which displays as 100% (with +40 offset)
    patientZoomLevel: data.patientSettings?.zoomLevel ?? 60,
    therapistZoomLevel: data.therapistSettings?.zoomLevel ?? 60,
    therapistNotes: data.therapistSettings?.notes,
    version: typeof data.version === 'number' ? data.version : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}

