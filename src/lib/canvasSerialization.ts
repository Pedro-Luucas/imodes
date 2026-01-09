import type {
  CanvasState,
  CanvasCard,
  Gender,
  TextElement,
  PostItElement,
  TherapistSettings,
  DrawPath,
} from '@/types/canvas';

/**
 * Serialize canvas state to JSON format for storage
 * Ensures all card properties including width and height are included
 */
export interface SerializeCanvasStateOptions {
  cards: CanvasCard[];
  textElements: TextElement[];
  postItElements: PostItElement[];
  gender: Gender;
  patientZoomLevel: number;
  therapistZoomLevel: number;
  therapistNotes?: string;
  version?: number;
  updatedAt?: string;
  drawPaths?: DrawPath[];
}

export function serializeCanvasState({
  cards,
  textElements,
  postItElements,
  gender,
  patientZoomLevel,
  therapistZoomLevel,
  therapistNotes,
  version,
  updatedAt,
  drawPaths,
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
    textElements: textElements.map((el) => ({
      ...el,
      fontSize: typeof el.fontSize === 'number' && el.fontSize > 0 ? el.fontSize : 24,
    })),
    postItElements: postItElements.map((el) => ({
      ...el,
    })),
    gender,
    patientSettings: {
      zoomLevel: patientZoomLevel,
    },
    therapistSettings,
    version,
    updatedAt,
    drawPaths: drawPaths?.map((path: DrawPath) => ({ ...path })),
  };
}

/**
 * Deserialize canvas state from JSON format
 * Returns default values if data is missing or invalid
 * Ensures all card properties including width and height are preserved
 */
export interface DeserializedCanvasState {
  cards: CanvasCard[];
  textElements: TextElement[];
  postItElements: PostItElement[];
  gender: Gender;
  patientZoomLevel: number;
  therapistZoomLevel: number;
  therapistNotes?: string;
  version?: number;
  updatedAt?: string;
  drawPaths: DrawPath[];
}

export function deserializeCanvasState(data: CanvasState | null): DeserializedCanvasState {
  // Default zoom is 60% actual which displays as 100% (with +40 offset)
  if (!data) {
    return {
      cards: [],
      textElements: [],
      postItElements: [],
      gender: 'male',
      patientZoomLevel: 60,
      therapistZoomLevel: 60,
      drawPaths: [],
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

  const rawTextElements = Array.isArray(data.textElements) ? data.textElements : [];
  const textElements: TextElement[] = rawTextElements.map((el) => ({
    id: String(el?.id || ''),
    x: typeof el?.x === 'number' ? el.x : 0,
    y: typeof el?.y === 'number' ? el.y : 0,
    text: typeof el?.text === 'string' ? el.text : '',
    fontSize: typeof el?.fontSize === 'number' && el.fontSize > 0 ? el.fontSize : 24,
    color: typeof el?.color === 'string' ? el.color : '#18181b',
    isBold: Boolean(el?.isBold || false),
    isUnderline: Boolean(el?.isUnderline || false),
    isEditing: Boolean(el?.isEditing || false),
  }));

  const rawPostItElements = Array.isArray(data.postItElements) ? data.postItElements : [];
  const postItElements: PostItElement[] = rawPostItElements.map((el) => ({
    id: String(el?.id || ''),
    x: typeof el?.x === 'number' ? el.x : 0,
    y: typeof el?.y === 'number' ? el.y : 0,
    text: typeof el?.text === 'string' ? el.text : '',
    color: typeof el?.color === 'string' ? el.color : '#fff085',
    isEditing: Boolean(el?.isEditing || false),
  }));

  return {
    cards,
    textElements,
    postItElements,
    gender: data.gender === 'female' ? 'female' : 'male',
    // Default zoom is 60% actual which displays as 100% (with +40 offset)
    patientZoomLevel: data.patientSettings?.zoomLevel ?? 60,
    therapistZoomLevel: data.therapistSettings?.zoomLevel ?? 60,
    therapistNotes: data.therapistSettings?.notes,
    version: typeof data.version === 'number' ? data.version : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    drawPaths: Array.isArray(data.drawPaths) ? data.drawPaths.map((path: DrawPath) => ({ ...path })) : [],
  };
}
