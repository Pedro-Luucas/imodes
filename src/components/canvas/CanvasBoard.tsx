'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Stage, Layer, Line, Group, Circle } from 'react-konva';
import Konva from 'konva';
import { toast } from 'sonner';
import {
  CanvasCard as CanvasCardType,
  Gender,
  CardCategory,
  ToolMode,
  DrawPath,
  TextElement,
  PostItElement,
} from '@/types/canvas';
import { CanvasCard } from './CanvasCard';
import { CanvasLoading } from './CanvasLoading';
import { TextElementComponent } from './TextElement';
import { PostItElementComponent } from './PostItElement';
import { preloadImagesWithPriority } from '@/lib/imagePreloader';
import { saveCard } from '@/lib/savedCardsTracker';
import { useCanvasStore, canvasStore } from '@/stores/canvasStore';
import { useCanvasRealtime } from '@/hooks/useCanvasRealtime';
import { buildSerializableCanvasState } from '@/lib/canvasPersistence';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CanvasBoardProps {
  onAddCard?: (card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  scale?: number;
  gender?: Gender;
  locale?: string;
  toolMode?: ToolMode;
  sessionId?: string | null;
  userRole?: 'patient' | 'therapist';
  onSave?: () => Promise<void>;
  onZoomChange?: (zoomLevel: number) => void;
  onCanvasClick?: () => void;
  strokeColor?: string;
  strokeWidth?: number;
  isEraserMode?: boolean;
  // Text element settings
  textColor?: string;
  textFontSize?: number;
  // Post-it element settings
  postItColor?: string;
}

interface WindowWithCanvasCard extends Window {
  _addCanvasCard?: (card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  _clearCanvas?: () => void;
  _manualSaveCanvas?: () => Promise<void>;
  _undoCanvas?: () => void;
  _redoCanvas?: () => void;
  _takeCanvasScreenshot?: () => Promise<Blob | null>;
  _restoreCanvasState?: (state: import('@/types/canvas').CanvasState) => void;
  _resetCardPosition?: () => void;
  _fitToScreen?: () => void;
}

const CARD_COLORS = [
  '#0ea5e9', // sky
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#6366f1', // indigo
];

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;

export function CanvasBoard({
  scale = 1,
  gender = 'male',
  toolMode = 'select',
  sessionId,
  userRole,
  onZoomChange,
  onCanvasClick,
  strokeColor = '#000000',
  strokeWidth = 2,
  isEraserMode = false,
  textColor = '#18181b',
  textFontSize = 24,
  postItColor = '#fff085',
}: CanvasBoardProps) {
  const t = useTranslations('canvas.card');
  const cards = useCanvasStore((state) => state.cards);
  const textElements = useCanvasStore((state) => state.textElements);
  const postItElements = useCanvasStore((state) => state.postItElements);
  const drawPaths = useCanvasStore((state) => state.drawPaths);
  const selectedCardId = useCanvasStore((state) => state.selectedCardId);
  const selectedTextElementId = useCanvasStore((state) => state.selectedTextElementId);
  const selectedPostItElementId = useCanvasStore((state) => state.selectedPostItElementId);
  const selectedDrawPathId = useCanvasStore((state) => state.selectedDrawPathId);
  const displayScale = useCanvasStore((state) => state.displayScale);
  const stagePosition = useCanvasStore((state) => state.stagePosition);
  const currentGender = useCanvasStore((state) => state.gender);
  const isHydrated = useCanvasStore((state) => state.isHydrated);
  const lastSavedVersion = useCanvasStore((state) => state.lastSavedVersion);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[] | null>(null);
  const [pathsToErase, setPathsToErase] = useState<Set<string>>(new Set());
  const [pathsBeingErased, setPathsBeingErased] = useState<Set<string>>(new Set()); // Paths currently being touched by eraser (for opacity effect)
  const [eraserPosition, setEraserPosition] = useState<{ x: number; y: number } | null>(null); // Current eraser cursor position

  const storeActionsRef = useRef(canvasStore.getState());
  const {
    addCard,
    updateCard,
    removeCard,
    addTextElement,
    updateTextElement,
    removeTextElement,
    bringTextElementToFront,
    selectTextElement,
    addPostItElement,
    updatePostItElement,
    removePostItElement,
    bringPostItElementToFront,
    selectPostItElement,
    clearCanvas,
    bringCardToFront,
    selectCard,
    setDisplayScale,
    setStagePosition,
    setZoomLevel,
    setGender,
    saveHistorySnapshot,
    undo,
    redo,
    markDirty,
    addDrawPath,
    updateDrawPath,
    removeDrawPath,
    selectDrawPath,
    applySnapshot,
  } = storeActionsRef.current;

  const { publish } = useCanvasRealtime({
    sessionId: sessionId ?? undefined,
    enabled: Boolean(sessionId),
  });

  const showLoading = Boolean(sessionId) && !isHydrated;

  useEffect(() => {
    if (!isHydrated) {
      lastBroadcastVersionRef.current = lastSavedVersion ?? 0;
    }
  }, [isHydrated, lastSavedVersion]);

  useEffect(() => {
    if (!sessionId || !isHydrated) return;
    if (typeof lastSavedVersion !== 'number' || lastSavedVersion <= 0) {
      return;
    }
    if (lastSavedVersion === lastBroadcastVersionRef.current) {
      return;
    }

    const snapshot = buildSerializableCanvasState();
    void publish(
      'state.snapshot',
      {
        state: snapshot,
        origin: 'autosave',
      },
      { version: lastSavedVersion }
    );
    lastBroadcastVersionRef.current = lastSavedVersion;
  }, [isHydrated, lastSavedVersion, publish, sessionId]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showAddToFrequentlyUsedDialog, setShowAddToFrequentlyUsedDialog] = useState(false);
  const [cardToAddToFrequentlyUsed, setCardToAddToFrequentlyUsed] =
    useState<CanvasCardType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const prevScaleRef = useRef<number>(scale);
  const stagePositionRef = useRef(stagePosition);
  const panStageStartRef = useRef({ x: 0, y: 0 });
  const panPointerStartRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const hasCenteredRef = useRef(false);
  const didPanRef = useRef(false);
  const dragDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastVersionRef = useRef<number>(lastSavedVersion ?? 0);
  // Pinch zoom refs
  const isPinchingRef = useRef(false);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  // Track last card position for cascading offset
  const lastCardPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleUndo = useCallback(() => {
    undo();
    markDirty('interaction');

    if (sessionId) {
      // Broadcast the new state after undo to sync with other participants
      const snapshot = buildSerializableCanvasState();
      void publish('state.snapshot', {
        state: snapshot,
        origin: 'manual',
      });
    }
  }, [undo, markDirty, sessionId, publish]);

  const handleRedo = useCallback(() => {
    redo();
    markDirty('interaction');

    if (sessionId) {
      // Broadcast the new state after redo to sync with other participants
      const snapshot = buildSerializableCanvasState();
      void publish('state.snapshot', {
        state: snapshot,
        origin: 'manual',
      });
    }
  }, [redo, markDirty, sessionId, publish]);

  // Update gender state when prop changes
  useEffect(() => {
    setGender(gender);
  }, [gender, setGender]);

  // Sync zoom level to store based on user role (for persistence)
  // Note: displayScale is updated in the zoom centering effect to avoid flickering
  useEffect(() => {
    if (userRole === 'patient') {
      setZoomLevel('patient', scale * 100);
    } else if (userRole === 'therapist') {
      setZoomLevel('therapist', scale * 100);
    }
  }, [scale, setZoomLevel, userRole]);

  // Keep ref in sync with state
  useEffect(() => {
    stagePositionRef.current = stagePosition;
  }, [stagePosition]);

  useEffect(() => {
    hasCenteredRef.current = false;
  }, [sessionId]);

  // Monitor console errors for Konva/Brave shield issues
  useEffect(() => {
    let hasShownWarning = false;

    const checkAndShowWarning = (errorMessage: string) => {
      // Check if we've already shown the warning
      if (hasShownWarning) {
        return;
      }

      const lowerMessage = errorMessage.toLowerCase();

      // Check for Konva errors related to Brave shield or similar issues
      const isKonvaError = lowerMessage.includes('konva') || lowerMessage.includes('konvajs');
      const isBraveShieldError =
        lowerMessage.includes('brave shield') ||
        lowerMessage.includes('brave') ||
        lowerMessage.includes('shield') ||
        lowerMessage.includes('breaks konva') ||
        lowerMessage.includes('breaks konvajs') ||
        lowerMessage.includes('installhook');

      if (isKonvaError && isBraveShieldError) {
        hasShownWarning = true;
        toast.warning('Canvas Compatibility Warning', {
          description: 'The canvas may not work properly due to browser extensions or privacy settings (such as Brave Shield) that interfere with Konva.js. Please disable any ad blockers, privacy shields, or similar browser extensions that may be blocking canvas functionality.',
          duration: 10000,
        });
      }
    };

    // Store original console.error
    const originalError = console.error;

    // Override console.error to intercept errors
    console.error = (...args: unknown[]) => {
      // Call original console.error first
      originalError.apply(console, args);

      // Convert all arguments to string for pattern matching
      const errorMessage = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      checkAndShowWarning(errorMessage);
    };

    // Also listen to window error events as a backup
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || String(event.error || '');
      checkAndShowWarning(errorMessage);
    };

    window.addEventListener('error', handleError);

    // Cleanup: restore original console.error and remove listener
    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Handle canvas dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Center the view after loading is complete
  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    if (hasCenteredRef.current) return;
    // Wait for hydration to complete when there's a session
    if (sessionId && !isHydrated) return;

    // Get current cards from the store
    const currentCards = canvasStore.getState().cards;

    let centeredPosition: { x: number; y: number };

    if (currentCards.length > 0) {
      // Calculate bounding box of all cards
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      currentCards.forEach((card) => {
        minX = Math.min(minX, card.x);
        minY = Math.min(minY, card.y);
        maxX = Math.max(maxX, card.x + card.width);
        maxY = Math.max(maxY, card.y + card.height);
      });

      // Calculate center of bounding box
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;

      // Position stage so content center is at viewport center
      // Formula: viewportCenter = stagePosition + contentCenter * scale
      // So: stagePosition = viewportCenter - contentCenter * scale
      centeredPosition = {
        x: dimensions.width / 2 - contentCenterX * displayScale,
        y: dimensions.height / 2 - contentCenterY * displayScale,
      };
    } else {
      // No cards, center the origin
      centeredPosition = {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      };
    }

    setStagePosition(centeredPosition);
    stagePositionRef.current = centeredPosition;
    hasCenteredRef.current = true;
  }, [dimensions.width, dimensions.height, sessionId, isHydrated, displayScale, setStagePosition]);

  // Handle zoom centering - always zoom on viewport center
  useEffect(() => {
    // Skip if scale hasn't changed
    if (prevScaleRef.current === scale) return;

    // Skip if dimensions are not yet available
    if (!dimensions.width || !dimensions.height) {
      prevScaleRef.current = scale;
      setDisplayScale(scale);
      return;
    }

    const oldScale = prevScaleRef.current;
    const newScale = scale;

    // Always use viewport center for zoom - convert from screen coords to stage coords
    const viewportCenterX = dimensions.width / 2;
    const viewportCenterY = dimensions.height / 2;
    const stageCenterX = (viewportCenterX - stagePositionRef.current.x) / oldScale;
    const stageCenterY = (viewportCenterY - stagePositionRef.current.y) / oldScale;

    // Calculate new stage position to keep viewport center visually fixed
    // Formula: newPos = viewportCenter - stageCenter * newScale
    const newPosition = {
      x: viewportCenterX - stageCenterX * newScale,
      y: viewportCenterY - stageCenterY * newScale,
    };

    // Update refs first to keep them in sync
    stagePositionRef.current = newPosition;
    prevScaleRef.current = newScale;

    // Update state synchronously - React will batch these together
    setDisplayScale(newScale);
    setStagePosition(newPosition);
  }, [scale, dimensions.width, dimensions.height, setDisplayScale, setStagePosition]);

  // Add card functionality - exposed via global method
  useEffect(() => {
    const handleAddCard = (cardData?: {
      imageUrl?: string;
      title: string;
      description: string;
      category: CardCategory;
      cardNumber: number;
    }) => {
      const colorIndex = cards.length % CARD_COLORS.length;
      const cardId = Date.now().toString();

      const cardWidth = 280;
      const cardHeight = 320;

      // Always fetch up-to-date viewport dimensions (state can lag during layout changes)
      const container = containerRef.current;
      const viewportWidth = container?.offsetWidth ?? dimensions.width;
      const viewportHeight = container?.offsetHeight ?? dimensions.height;

      const stagePos = stagePositionRef.current ?? { x: 0, y: 0 };
      const scale = displayScale || 1;

      let cardX: number;
      let cardY: number;

      // Cascading offset for subsequent cards
      const CASCADE_OFFSET = 30;

      if (lastCardPositionRef.current) {
        // Subsequent card: offset slightly from the previous card position for cascading effect
        cardX = lastCardPositionRef.current.x + CASCADE_OFFSET;
        cardY = lastCardPositionRef.current.y + CASCADE_OFFSET;
      } else {
        // First card: position at 75% width and 50% height of viewport
        if (viewportWidth > 0 && viewportHeight > 0) {
          // 75% from left edge, 50% from top edge in screen coordinates
          const targetScreenX = viewportWidth * 0.75;
          const targetScreenY = viewportHeight * 0.5;

          // Convert to stage coordinates
          const centerX = (targetScreenX - stagePos.x) / scale;
          const centerY = (targetScreenY - stagePos.y) / scale;

          // Position card so its center is at the computed point
          cardX = centerX - cardWidth / 2;
          cardY = centerY - cardHeight / 2;
        } else {
          // Fallback to keeping relative to current stage origin if dimensions are unavailable
          const centerX = -stagePos.x / scale;
          const centerY = -stagePos.y / scale;
          cardX = centerX - cardWidth / 2;
          cardY = centerY - cardHeight / 2;
        }
      }
      const newCard: CanvasCardType = {
        id: cardId,
        x: cardX,
        y: cardY,
        title: cardData?.title || t('newCard'),
        description: cardData?.description || '',
        color: CARD_COLORS[colorIndex],
        width: cardWidth,
        height: cardHeight,
        rotation: 0,
        imageUrl: cardData?.imageUrl,
        category: cardData?.category,
        cardNumber: cardData?.cardNumber,
        gender: currentGender,
      };

      addCard(newCard);
      markDirty('interaction');

      // Save this card's top-left position for the next card to cascade from
      lastCardPositionRef.current = { x: cardX, y: cardY };

      if (newCard.imageUrl) {
        preloadImagesWithPriority([newCard.imageUrl]).catch(() => undefined);
      }

      if (sessionId) {
        void publish('card.add', { card: newCard });
      }
    };

    // Expose method globally for parent to call
    const win = window as WindowWithCanvasCard;
    win._addCanvasCard = handleAddCard;

    return () => {
      delete win._addCanvasCard;
    };
  }, [
    addCard,
    cards.length,
    currentGender,
    dimensions.height,
    dimensions.width,
    displayScale,
    markDirty,
    publish,
    sessionId,
    t,
  ]);

  // Clear canvas functionality - exposed via global method
  useEffect(() => {
    const handleClearCanvas = () => {
      clearCanvas();
      markDirty('interaction');

      if (sessionId) {
        const snapshot = buildSerializableCanvasState();
        void publish('state.snapshot', {
          state: snapshot,
          origin: 'manual',
        });
      }
    };

    // Expose method globally for parent to call
    const win = window as WindowWithCanvasCard;
    win._clearCanvas = handleClearCanvas;

    return () => {
      delete win._clearCanvas;
    };
  }, [clearCanvas, markDirty, publish, sessionId]);

  // Expose undo/redo functions via window object
  useEffect(() => {
    const win = window as WindowWithCanvasCard;
    win._undoCanvas = handleUndo;
    win._redoCanvas = handleRedo;

    return () => {
      delete win._undoCanvas;
      delete win._redoCanvas;
    };
  }, [handleUndo, handleRedo]);

  // Take screenshot function - captures viewport with grid background
  const takeScreenshot = useCallback(async (): Promise<Blob | null> => {
    const stage = stageRef.current;
    if (!stage || !dimensions.width || !dimensions.height) {
      return null;
    }

    // Create an offscreen canvas to composite the grid + stage content
    const canvas = document.createElement('canvas');
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * pixelRatio;
    canvas.height = dimensions.height * pixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    // Scale for high DPI displays
    ctx.scale(pixelRatio, pixelRatio);

    // Draw the grid background
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 32;

    // Vertical lines
    for (let x = 0; x <= dimensions.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= dimensions.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }

    // Get the stage content as an image
    const stageDataUrl = stage.toDataURL({ pixelRatio });

    // Draw the stage content on top of the grid
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 1.0);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = stageDataUrl;
    });
  }, [dimensions.width, dimensions.height]);

  // Expose screenshot function via window object
  useEffect(() => {
    const win = window as WindowWithCanvasCard;
    win._takeCanvasScreenshot = takeScreenshot;

    return () => {
      delete win._takeCanvasScreenshot;
    };
  }, [takeScreenshot]);

  // Restore canvas state from checkpoint
  const restoreCanvasState = useCallback((state: import('@/types/canvas').CanvasState) => {
    applySnapshot(state, { replaceHistory: true });
    markDirty('interaction');

    if (sessionId) {
      void publish('state.snapshot', {
        state,
        origin: 'manual',
      });
    }
  }, [applySnapshot, markDirty, publish, sessionId]);

  // Expose restore function via window object
  useEffect(() => {
    const win = window as WindowWithCanvasCard;
    win._restoreCanvasState = restoreCanvasState;

    return () => {
      delete win._restoreCanvasState;
    };
  }, [restoreCanvasState]);

  // Reset card position - called when toolspanel closes
  const resetCardPosition = useCallback(() => {
    lastCardPositionRef.current = null;
  }, []);

  // Fit to screen - centers view on all elements
  const fitToScreen = useCallback(() => {
    if (!dimensions.width || !dimensions.height) {
      console.warn('[Fit to Screen] Dimensions not available');
      return;
    }

    const currentCards = canvasStore.getState().cards;
    const currentTextElements = canvasStore.getState().textElements;
    const currentPostItElements = canvasStore.getState().postItElements;
    const currentDrawPaths = canvasStore.getState().drawPaths;

    console.log('[Fit to Screen] Calculando fit para:', {
      cards: currentCards.length,
      textElements: currentTextElements.length,
      postItElements: currentPostItElements.length,
      drawPaths: currentDrawPaths.length,
      viewport: { width: dimensions.width, height: dimensions.height },
    });

    // If no elements, just center the origin
    if (currentCards.length === 0 && currentTextElements.length === 0 && currentPostItElements.length === 0 && currentDrawPaths.length === 0) {
      const centeredPosition = {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      };
      console.log('[Fit to Screen] Sem elementos, centralizando:', centeredPosition);
      setStagePosition(centeredPosition);
      stagePositionRef.current = centeredPosition;
      return;
    }

    // Calculate bounding box of all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Include cards
    currentCards.forEach((card) => {
      minX = Math.min(minX, card.x);
      minY = Math.min(minY, card.y);
      maxX = Math.max(maxX, card.x + (card.width || 280));
      maxY = Math.max(maxY, card.y + (card.height || 320));
    });

    // Include text elements (estimate size based on font size)
    currentTextElements.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + 200); // Estimate width
      maxY = Math.max(maxY, el.y + (el.fontSize || 24) * 1.5);
    });

    // Include post-it elements (fixed size 200x200)
    currentPostItElements.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + 200);
      maxY = Math.max(maxY, el.y + 200);
    });

    // Include draw paths
    currentDrawPaths.forEach((path) => {
      if (path.points && path.points.length >= 2) {
        const pathX = path.x || 0;
        const pathY = path.y || 0;
        for (let i = 0; i < path.points.length; i += 2) {
          const x = pathX + path.points[i];
          const y = pathY + path.points[i + 1];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    });

    // If no valid bounds found, center the origin
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      console.warn('[Fit to Screen] Bounds inválidos, centralizando');
      const centeredPosition = {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      };
      setStagePosition(centeredPosition);
      stagePositionRef.current = centeredPosition;
      return;
    }

    // Add padding (10% of viewport on each side)
    const paddingX = dimensions.width * 0.1;
    const paddingY = dimensions.height * 0.1;
    const availableWidth = dimensions.width - 2 * paddingX;
    const availableHeight = dimensions.height - 2 * paddingY;

    // Calculate content dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    console.log('[Fit to Screen] Bounds calculados:', {
      minX,
      minY,
      maxX,
      maxY,
      contentWidth,
      contentHeight,
      availableWidth,
      availableHeight,
    });

    // Calculate scale to fit content with padding
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, MAX_SCALE); // Don't zoom in too much
    const clampedScale = Math.max(newScale, MIN_SCALE); // Don't zoom out too much

    // Calculate center of content
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Calculate new position to center content
    const newPosition = {
      x: dimensions.width / 2 - contentCenterX * clampedScale,
      y: dimensions.height / 2 - contentCenterY * clampedScale,
    };

    console.log('[Fit to Screen] Aplicando:', {
      scale: clampedScale,
      scalePercent: clampedScale * 100,
      position: newPosition,
      contentCenter: { x: contentCenterX, y: contentCenterY },
    });

    // Update scale directly in store first (for immediate visual feedback)
    setDisplayScale(clampedScale);
    prevScaleRef.current = clampedScale;

    // Update position
    setStagePosition(newPosition);
    stagePositionRef.current = newPosition;

    // Update scale via parent component (which will trigger zoom effect and sync with zoom level)
    if (onZoomChange) {
      onZoomChange(clampedScale * 100);
    }
  }, [dimensions.width, dimensions.height, setStagePosition, setDisplayScale, onZoomChange]);

  // Expose reset function via window object
  useEffect(() => {
    const win = window as WindowWithCanvasCard;
    win._resetCardPosition = resetCardPosition;

    return () => {
      delete win._resetCardPosition;
    };
  }, [resetCardPosition]);

  // Expose fitToScreen function via window object
  useEffect(() => {
    const win = window as WindowWithCanvasCard;
    win._fitToScreen = fitToScreen;

    return () => {
      delete win._fitToScreen;
    };
  }, [fitToScreen]);

  const handleCardDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateCard(id, { x, y }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 300);

      markDirty('interaction');

      if (sessionId) {
        void publish('card.patch', {
          id,
          patch: { x, y },
        });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updateCard]
  );

  const handleCardDelete = useCallback(
    (id: string) => {
      removeCard(id);
      if (selectedCardId === id) {
        selectCard(null);
      }

      markDirty('interaction');

      if (sessionId) {
        void publish('card.remove', { id });
      }
    },
    [markDirty, publish, removeCard, selectCard, selectedCardId, sessionId]
  );

  const handleCardLockToggle = useCallback(
    (id: string) => {
      const card = canvasStore.getState().cards.find((c) => c.id === id);
      if (!card) {
        return;
      }

      const locked = !(card.locked ?? false);
      updateCard(id, { locked });
      markDirty('interaction');

      if (sessionId) {
        void publish('card.patch', { id, patch: { locked } });
      }
    },
    [markDirty, publish, sessionId, updateCard]
  );

  const handleCardSizeChange = useCallback(
    (id: string, width: number, height: number) => {
      updateCard(id, { width, height }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 300);

      markDirty('interaction');

      if (sessionId) {
        void publish('card.patch', { id, patch: { width, height } });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updateCard]
  );

  /* const handleCardRotationChange = useCallback(
    (id: string, rotation: number) => {
      updateCard(id, { rotation }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 300);

      markDirty('interaction');

      if (sessionId) {
        void publish('card.patch', { id, patch: { rotation } });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updateCard]
  ); */

  const handleAddToSavedCards = useCallback((id: string) => {
    const card = cards.find((c) => c.id === id);
    if (card && card.category && card.cardNumber !== undefined) {
      setCardToAddToFrequentlyUsed(card);
      setShowAddToFrequentlyUsedDialog(true);
    }
  }, [cards]);

  const handleConfirmAddToSavedCards = useCallback(() => {
    if (cardToAddToFrequentlyUsed && cardToAddToFrequentlyUsed.category && cardToAddToFrequentlyUsed.cardNumber !== undefined) {
      saveCard({
        cardNumber: cardToAddToFrequentlyUsed.cardNumber,
        category: cardToAddToFrequentlyUsed.category,
        imageUrl: cardToAddToFrequentlyUsed.imageUrl,
        title: cardToAddToFrequentlyUsed.title,
        description: cardToAddToFrequentlyUsed.description,
      });
      toast.success(t('addedToSavedCards') || 'Card saved');
      setShowAddToFrequentlyUsedDialog(false);
      setCardToAddToFrequentlyUsed(null);
    }
  }, [cardToAddToFrequentlyUsed, t]);

  const handleDrawPathSelect = useCallback(
    (id: string) => {
      selectDrawPath(id);
    },
    [selectDrawPath]
  );

  const handleDrawPathDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateDrawPath(id, { x, y }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 300);

      markDirty('interaction');

      if (sessionId) {
        void publish('drawPath.patch', {
          id,
          patch: { x, y },
        });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updateDrawPath]
  );

  const handleDrawPathDelete = useCallback(
    (id: string) => {
      removeDrawPath(id);
      if (selectedDrawPathId === id) {
        selectDrawPath(null);
      }

      markDirty('interaction');

      if (sessionId) {
        void publish('drawPath.remove', { id });
      }
    },
    [markDirty, publish, removeDrawPath, selectDrawPath, selectedDrawPathId, sessionId]
  );

  const handleCardSelect = useCallback(
    (id: string) => {
      selectCard(id);
      bringCardToFront(id, { skipHistory: true });
    },
    [bringCardToFront, selectCard]
  );

  const stopCanvasPan = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = '';
    }
  }, []);

  const startCanvasPan = useCallback((clientX: number, clientY: number) => {
    isPanningRef.current = true;
    didPanRef.current = false;
    panPointerStartRef.current = { x: clientX, y: clientY };
    panStageStartRef.current = { ...stagePositionRef.current };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const moveCanvasPan = useCallback((clientX: number, clientY: number) => {
    if (!isPanningRef.current) return;
    const deltaX = clientX - panPointerStartRef.current.x;
    const deltaY = clientY - panPointerStartRef.current.y;

    if (!didPanRef.current && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
      didPanRef.current = true;
    }

    const newPosition = {
      x: panStageStartRef.current.x + deltaX,
      y: panStageStartRef.current.y + deltaY,
    };

    setStagePosition(newPosition);
    stagePositionRef.current = newPosition;
  }, [setStagePosition]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;

    if (toolMode === 'draw') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const stageX = (pos.x - stagePositionRef.current.x) / displayScale;
      const stageY = (pos.y - stagePositionRef.current.y) / displayScale;

      setIsDrawing(true);
      if (isEraserMode) {
        setPathsToErase(new Set());
        setPathsBeingErased(new Set()); // Clear previous erased paths state
      } else {
        setCurrentPath([stageX, stageY]);
      }
      return;
    }

    if (e.target !== e.target.getStage()) return;
    e.evt.preventDefault();
    startCanvasPan(e.evt.clientX, e.evt.clientY);
  }, [startCanvasPan, toolMode, displayScale, isEraserMode]);

  // Helper function to calculate distance from point to line segment
  const pointToLineDistance = useCallback((px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const stageX = (pos.x - stagePositionRef.current.x) / displayScale;
    const stageY = (pos.y - stagePositionRef.current.y) / displayScale;

    // Update eraser position for visual feedback (even when not drawing)
    if (toolMode === 'draw' && isEraserMode) {
      setEraserPosition({ x: stageX, y: stageY });
    } else {
      setEraserPosition(null);
    }

    if (toolMode === 'draw' && isDrawing) {
      // If eraser mode, detect which paths are being touched
      if (isEraserMode) {
        const currentDrawPaths = canvasStore.getState().drawPaths;
        const eraserRadius = strokeWidth / 2;
        const touchedPaths = new Set<string>();

        currentDrawPaths.forEach((path) => {
          if (path.isEraser) return; // Skip eraser paths themselves
          
          const pathPoints = path.points;
          const pathX = path.x || 0;
          const pathY = path.y || 0;

          // Check each segment of the path
          for (let i = 0; i < pathPoints.length - 2; i += 2) {
            const x1 = pathX + pathPoints[i];
            const y1 = pathY + pathPoints[i + 1];
            const x2 = pathX + pathPoints[i + 2];
            const y2 = pathY + pathPoints[i + 3];

            const distance = pointToLineDistance(stageX, stageY, x1, y1, x2, y2);
            if (distance <= eraserRadius + (path.strokeWidth / 2)) {
              touchedPaths.add(path.id);
              break;
            }
          }
        });

        // Update paths being erased (for opacity effect)
        setPathsBeingErased(touchedPaths);

        // Mark paths to be deleted when mouse is released
        if (touchedPaths.size > 0) {
          setPathsToErase((prev) => {
            const newSet = new Set(prev);
            touchedPaths.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      } else {
        setCurrentPath((prev) => (prev ? [...prev, stageX, stageY] : [stageX, stageY]));
      }
      return;
    }

    if (!isPanningRef.current) return;
    moveCanvasPan(e.evt.clientX, e.evt.clientY);
  }, [moveCanvasPan, toolMode, isDrawing, displayScale, isEraserMode, strokeWidth, pointToLineDistance]);

  const handleStageMouseUp = useCallback(() => {
    if (toolMode === 'draw' && isDrawing) {
      if (isEraserMode) {
        // Remove all touched paths
        if (pathsToErase.size > 0) {
          pathsToErase.forEach((pathId) => {
            removeDrawPath(pathId);
            markDirty('interaction');
            if (sessionId) {
              void publish('drawPath.remove', { id: pathId });
            }
          });
          setPathsToErase(new Set());
        }
        // Clear paths being erased state (restore opacity to normal)
        setPathsBeingErased(new Set());
      } else if (currentPath) {
        const newPath: DrawPath = {
          id: Date.now().toString(),
          points: currentPath,
          color: strokeColor,
          strokeWidth: strokeWidth,
          isEraser: false,
        };
        addDrawPath(newPath);
        markDirty('interaction');

        if (sessionId) {
          void publish('drawPath.add', { path: newPath });
        }
      }
    }

    setIsDrawing(false);
    setCurrentPath(null);
    stopCanvasPan();
  }, [stopCanvasPan, toolMode, isDrawing, currentPath, strokeColor, strokeWidth, isEraserMode, pathsToErase, removeDrawPath, addDrawPath, markDirty, sessionId, publish]);

  const handleStageMouseLeave = useCallback(() => {
    stopCanvasPan();
    // Clear eraser position when mouse leaves stage
    if (toolMode === 'draw' && isEraserMode) {
      setEraserPosition(null);
      setPathsBeingErased(new Set());
    }
  }, [stopCanvasPan, toolMode, isEraserMode]);

  const handleStageMouseEnter = useCallback(() => {
    // Update cursor when mouse enters the stage
    if (toolMode === 'draw') {
      const cursor = isEraserMode ? 'not-allowed' : 'crosshair';
      if (stageRef.current) {
        const stageContainer = stageRef.current.container();
        if (stageContainer) {
          stageContainer.style.cursor = cursor;
        }
      }
    }
  }, [toolMode, isEraserMode]);

  // Helper to calculate distance between two touch points
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper to get center point between two touches
  const getTouchCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  const handleStageTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (toolMode === 'draw') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const stageX = (pos.x - stagePositionRef.current.x) / displayScale;
      const stageY = (pos.y - stagePositionRef.current.y) / displayScale;

      setIsDrawing(true);
      if (isEraserMode) {
        setPathsToErase(new Set());
      } else {
        setCurrentPath([stageX, stageY]);
      }
      return;
    }
    if (e.target !== e.target.getStage()) return;
    e.evt.preventDefault();

    const touches = e.evt.touches;

    // Two finger touch - start pinch zoom
    if (touches.length === 2) {
      isPinchingRef.current = true;
      isPanningRef.current = false;
      pinchStartDistanceRef.current = getTouchDistance(touches[0], touches[1]);
      pinchStartScaleRef.current = displayScale;
      const center = getTouchCenter(touches[0], touches[1]);
      pinchCenterRef.current = center;
      return;
    }

    // Single finger touch - start panning
    if (touches.length === 1) {
      const touch = touches[0];
      startCanvasPan(touch.clientX, touch.clientY);
    }
  }, [startCanvasPan, getTouchDistance, getTouchCenter, displayScale, toolMode, isEraserMode]);

  const handleStageTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (toolMode === 'draw' && isDrawing) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const stageX = (pos.x - stagePositionRef.current.x) / displayScale;
      const stageY = (pos.y - stagePositionRef.current.y) / displayScale;

      // If eraser mode, detect which paths are being touched
      if (isEraserMode) {
        const currentDrawPaths = canvasStore.getState().drawPaths;
        const eraserRadius = strokeWidth / 2;
        const touchedPaths = new Set<string>();

        currentDrawPaths.forEach((path) => {
          if (path.isEraser) return; // Skip eraser paths themselves
          
          const pathPoints = path.points;
          const pathX = path.x || 0;
          const pathY = path.y || 0;

          // Check each segment of the path
          for (let i = 0; i < pathPoints.length - 2; i += 2) {
            const x1 = pathX + pathPoints[i];
            const y1 = pathY + pathPoints[i + 1];
            const x2 = pathX + pathPoints[i + 2];
            const y2 = pathY + pathPoints[i + 3];

            const distance = pointToLineDistance(stageX, stageY, x1, y1, x2, y2);
            if (distance <= eraserRadius + (path.strokeWidth / 2)) {
              touchedPaths.add(path.id);
              break;
            }
          }
        });

        if (touchedPaths.size > 0) {
          setPathsToErase((prev) => {
            const newSet = new Set(prev);
            touchedPaths.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      } else {
        setCurrentPath((prev) => (prev ? [...prev, stageX, stageY] : [stageX, stageY]));
      }
      return;
    }
    
    const touches = e.evt.touches;

    // Handle pinch zoom
    if (isPinchingRef.current && touches.length === 2) {
      e.evt.preventDefault();

      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);

      // Calculate new scale based on pinch distance change
      const scaleFactor = currentDistance / pinchStartDistanceRef.current;
      let newScale = pinchStartScaleRef.current * scaleFactor;
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      if (newScale !== displayScale) {
        // Calculate the center point in stage coordinates using the initial pinch center
        const centerX = (pinchCenterRef.current.x - stagePositionRef.current.x) / displayScale;
        const centerY = (pinchCenterRef.current.y - stagePositionRef.current.y) / displayScale;

        // Calculate position adjustment to keep pinch center fixed
        const newPosition = {
          x: currentCenter.x - centerX * newScale,
          y: currentCenter.y - centerY * newScale,
        };

        setDisplayScale(newScale);
        setStagePosition(newPosition);
        stagePositionRef.current = newPosition;
        prevScaleRef.current = newScale;

        if (onZoomChange) {
          onZoomChange(newScale * 100);
        }
        const zoomPercent = newScale * 100;
        if (userRole === 'patient') {
          setZoomLevel('patient', zoomPercent);
        } else if (userRole === 'therapist') {
          setZoomLevel('therapist', zoomPercent);
        }
      }

      // Update pinch center for panning while pinching
      pinchCenterRef.current = currentCenter;
      return;
    }

    // Handle single-finger panning
    if (!isPanningRef.current) return;
    const touch = touches[0] || e.evt.changedTouches[0];
    if (!touch) return;
    e.evt.preventDefault();
    moveCanvasPan(touch.clientX, touch.clientY);
  }, [moveCanvasPan, getTouchDistance, getTouchCenter, displayScale, onZoomChange, setDisplayScale, setStagePosition, setZoomLevel, userRole, isDrawing, toolMode, isEraserMode, strokeWidth, pointToLineDistance]);

  const handleStageTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (toolMode === 'draw' && isDrawing) {
      if (isEraserMode) {
        // Remove all touched paths
        if (pathsToErase.size > 0) {
          pathsToErase.forEach((pathId) => {
            removeDrawPath(pathId);
            markDirty('interaction');
            if (sessionId) {
              void publish('drawPath.remove', { id: pathId });
            }
          });
          setPathsToErase(new Set());
        }
      } else if (currentPath) {
        const newPath: DrawPath = {
          id: Date.now().toString(),
          points: currentPath,
          color: strokeColor,
          strokeWidth: strokeWidth,
          isEraser: false,
        };
        addDrawPath(newPath);
        markDirty('interaction');

        if (sessionId) {
          void publish('drawPath.add', { path: newPath });
        }
      }
    }

    // If we were pinching and now have 1 or 0 fingers, stop pinching
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      // If there's still one finger, start panning from that position
      if (e.evt.touches.length === 1) {
        const touch = e.evt.touches[0];
        startCanvasPan(touch.clientX, touch.clientY);
        return;
      }
    }

    setIsDrawing(false);
    setCurrentPath(null);
    stopCanvasPan();
  }, [stopCanvasPan, startCanvasPan, toolMode, isDrawing, currentPath, strokeColor, strokeWidth, isEraserMode, pathsToErase, removeDrawPath, addDrawPath, markDirty, sessionId, publish]);

  const handleStageTouchCancel = useCallback(() => {
    isPinchingRef.current = false;
    stopCanvasPan();
  }, [stopCanvasPan]);

  const handleStageWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!e.evt.ctrlKey) return;
    e.evt.preventDefault();

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;

    let newScale = displayScale * (direction > 0 ? scaleBy : 1 / scaleBy);
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    if (newScale === displayScale) return;

    const viewportCenterX = dimensions.width / 2;
    const viewportCenterY = dimensions.height / 2;

    const centerX = (viewportCenterX - stagePositionRef.current.x) / displayScale;
    const centerY = (viewportCenterY - stagePositionRef.current.y) / displayScale;

    const newPosition = {
      x: stagePositionRef.current.x + centerX * (displayScale - newScale),
      y: stagePositionRef.current.y + centerY * (displayScale - newScale),
    };

    setDisplayScale(newScale);
    setStagePosition(newPosition);
    stagePositionRef.current = newPosition;
    prevScaleRef.current = newScale;

    if (onZoomChange) {
      onZoomChange(newScale * 100);
    }
    const zoomPercent = newScale * 100;
    if (userRole === 'patient') {
      setZoomLevel('patient', zoomPercent);
    } else if (userRole === 'therapist') {
      setZoomLevel('therapist', zoomPercent);
    }
  }, [displayScale, dimensions.width, dimensions.height, onZoomChange, setStagePosition, setDisplayScale, setZoomLevel, userRole]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (didPanRef.current) {
        didPanRef.current = false;
        return;
      }
      const stage = e.target.getStage();
      if (!stage) return;

      // Handle text tool mode - create new text element
      if (toolMode === 'text' && e.target === stage) {
        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;
        const stageX = (pointerPos.x - stagePositionRef.current.x) / displayScale;
        const stageY = (pointerPos.y - stagePositionRef.current.y) / displayScale;

        const newTextElement: TextElement = {
          id: Date.now().toString(),
          x: stageX,
          y: stageY,
          text: '',
          fontSize: textFontSize,
          color: textColor,
          isBold: false,
          isUnderline: false,
          isEditing: true,
        };

        addTextElement(newTextElement);
        selectTextElement(newTextElement.id);
        selectCard(null);
        selectPostItElement(null);
        markDirty('interaction');

        if (sessionId) {
          void publish('textElement.add', { element: newTextElement });
        }
        return;
      }

      // Handle postit tool mode - create new post-it element
      if (toolMode === 'postit' && e.target === stage) {
        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;
        const stageX = (pointerPos.x - stagePositionRef.current.x) / displayScale;
        const stageY = (pointerPos.y - stagePositionRef.current.y) / displayScale;

        const newPostItElement: PostItElement = {
          id: Date.now().toString(),
          x: stageX - 100, // Center the 200x200 post-it
          y: stageY - 100,
          text: '',
          color: postItColor,
          isEditing: true,
        };

        addPostItElement(newPostItElement);
        selectPostItElement(newPostItElement.id);
        selectCard(null);
        selectTextElement(null);
        markDirty('interaction');

        if (sessionId) {
          void publish('postItElement.add', { element: newPostItElement });
        }
        return;
      }

      if (e.target === stage) {
        selectCard(null);
        selectTextElement(null);
        selectPostItElement(null);
      }

      // Notify parent of rapid click (not a drag) on canvas
      onCanvasClick?.();
    },
    [
      addTextElement,
      addPostItElement,
      displayScale,
      markDirty,
      publish,
      selectCard,
      selectTextElement,
      selectPostItElement,
      sessionId,
      toolMode,
      textColor,
      textFontSize,
      postItColor,
      onCanvasClick,
    ]
  );

  useEffect(() => {
    const handleWindowMouseUp = () => stopCanvasPan();
    const handleWindowTouchEnd = () => stopCanvasPan();

    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [stopCanvasPan]);

  // Update cursor based on tool mode
  useEffect(() => {
    const updateCursor = () => {
      if (toolMode === 'draw') {
        const cursor = isEraserMode ? 'not-allowed' : 'crosshair';
        
        // Update container cursor
        if (containerRef.current) {
          containerRef.current.style.cursor = cursor;
        }
        
        // Update Konva Stage container cursor
        if (stageRef.current) {
          const stageContainer = stageRef.current.container();
          if (stageContainer) {
            stageContainer.style.cursor = cursor;
          }
        }
      } else {
        // Default cursor for other modes (select, hand, text)
        if (containerRef.current) {
          containerRef.current.style.cursor = '';
        }
        if (stageRef.current) {
          const stageContainer = stageRef.current.container();
          if (stageContainer) {
            stageContainer.style.cursor = '';
          }
        }
      }
    };

    updateCursor();
  }, [toolMode, isEraserMode]);

  // Clear eraser state when exiting eraser mode
  useEffect(() => {
    if (!isEraserMode || toolMode !== 'draw') {
      setEraserPosition(null);
      setPathsBeingErased(new Set());
    }
  }, [isEraserMode, toolMode]);

  // Text Element Handlers
  const handleTextElementSelect = useCallback(
    (id: string) => {
      selectTextElement(id);
      selectCard(null);
      selectPostItElement(null);
      bringTextElementToFront(id, { skipHistory: true });
    },
    [bringTextElementToFront, selectCard, selectTextElement, selectPostItElement]
  );

  const handleTextElementDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateTextElement(id, { x, y }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 300);

      markDirty('interaction');

      if (sessionId) {
        void publish('textElement.patch', { id, patch: { x, y } });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updateTextElement]
  );

  const handleTextElementTextChange = useCallback(
    (id: string, text: string) => {
      updateTextElement(id, { text }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 500);

      markDirty('interaction');

      if (sessionId) {
        void publish('textElement.patch', { id, patch: { text } });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updateTextElement]
  );

  const handleTextElementEditStateChange = useCallback(
    (id: string, isEditing: boolean) => {
      updateTextElement(id, { isEditing }, { skipHistory: true });
    },
    [updateTextElement]
  );

  const handleTextElementDelete = useCallback(
    (id: string) => {
      removeTextElement(id);
      if (selectedTextElementId === id) {
        selectTextElement(null);
      }

      markDirty('interaction');

      if (sessionId) {
        void publish('textElement.remove', { id });
      }
    },
    [markDirty, publish, removeTextElement, selectTextElement, selectedTextElementId, sessionId]
  );

  // Post-It Element Handlers
  const handlePostItElementSelect = useCallback(
    (id: string) => {
      selectPostItElement(id);
      selectCard(null);
      selectTextElement(null);
      bringPostItElementToFront(id, { skipHistory: true });
    },
    [bringPostItElementToFront, selectCard, selectTextElement, selectPostItElement]
  );

  const handlePostItElementDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updatePostItElement(id, { x, y }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 300);

      markDirty('interaction');

      if (sessionId) {
        void publish('postItElement.patch', { id, patch: { x, y } });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updatePostItElement]
  );

  const handlePostItElementTextChange = useCallback(
    (id: string, text: string) => {
      updatePostItElement(id, { text }, { skipHistory: true });

      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveHistorySnapshot();
      }, 500);

      markDirty('interaction');

      if (sessionId) {
        void publish('postItElement.patch', { id, patch: { text } });
      }
    },
    [markDirty, publish, saveHistorySnapshot, sessionId, updatePostItElement]
  );

  const handlePostItElementEditStateChange = useCallback(
    (id: string, isEditing: boolean) => {
      updatePostItElement(id, { isEditing }, { skipHistory: true });
    },
    [updatePostItElement]
  );

  const handlePostItElementDelete = useCallback(
    (id: string) => {
      removePostItElement(id);
      if (selectedPostItElementId === id) {
        selectPostItElement(null);
      }

      markDirty('interaction');

      if (sessionId) {
        void publish('postItElement.remove', { id });
      }
    },
    [markDirty, publish, removePostItElement, selectPostItElement, selectedPostItElementId, sessionId]
  );

  // Delete selected card, text element, post-it, or drawing on Delete/Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea - don't delete in that case
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCardId) {
          handleCardDelete(selectedCardId);
        } else if (selectedTextElementId) {
          handleTextElementDelete(selectedTextElementId);
        } else if (selectedPostItElementId) {
          handlePostItElementDelete(selectedPostItElementId);
        } else if (selectedDrawPathId) {
          handleDrawPathDelete(selectedDrawPathId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardId, selectedTextElementId, selectedPostItElementId, selectedDrawPathId, handleCardDelete, handleTextElementDelete, handlePostItElementDelete, handleDrawPathDelete]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-[#f7f7f7]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      {showLoading && <CanvasLoading />}
      {!showLoading && dimensions.width > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          x={stagePosition.x}
          y={stagePosition.y}
          scaleX={displayScale}
          scaleY={displayScale}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseEnter={handleStageMouseEnter}
          onMouseLeave={handleStageMouseLeave}
          onTouchStart={handleStageTouchStart}
          onTouchMove={handleStageTouchMove}
          onTouchEnd={handleStageTouchEnd}
          onTouchCancel={handleStageTouchCancel}
          onWheel={handleStageWheel}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            <Group listening={toolMode === 'select'}>
              {cards.map((card) => (
                <CanvasCard
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  onSelect={() => handleCardSelect(card.id)}
                  onDragEnd={handleCardDragEnd}
                  onDelete={handleCardDelete}
                  onLockToggle={handleCardLockToggle}
                  onAddToFrequentlyUsed={handleAddToSavedCards}
                  onSizeChange={handleCardSizeChange}
                />
              ))}
            </Group>
            {drawPaths.map((path) => (
              <Line
                key={path.id}
                id={path.id}
                x={path.x || 0}
                y={path.y || 0}
                points={path.points}
                stroke={path.color}
                strokeWidth={path.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={path.isEraser ? "destination-out" : "source-over"}
                draggable={toolMode === 'select'}
                onClick={() => handleDrawPathSelect(path.id)}
                onTap={() => handleDrawPathSelect(path.id)}
                onDragEnd={(e) => handleDrawPathDragEnd(path.id, e.target.x(), e.target.y())}
                opacity={
                  pathsToErase.has(path.id) || pathsBeingErased.has(path.id)
                    ? 0.5 
                    : selectedDrawPathId === path.id 
                      ? 0.8 
                      : 1
                }
                shadowBlur={selectedDrawPathId === path.id ? 5 : 0}
                shadowColor={path.color}
                onMouseEnter={(e) => {
                  if (toolMode === 'select') {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'move';
                  }
                }}
                onMouseLeave={(e) => {
                  if (toolMode === 'select') {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }
                }}
              />
            ))}
            {currentPath && !isEraserMode && (
              <Line
                points={currentPath}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
              />
            )}
            {/* Eraser visual feedback circle */}
            {eraserPosition && toolMode === 'draw' && isEraserMode && (
              <Circle
                x={eraserPosition.x}
                y={eraserPosition.y}
                radius={strokeWidth / 2}
                fill="rgba(255, 255, 255, 0.3)"
                stroke="rgba(0, 0, 0, 0.5)"
                strokeWidth={1}
                listening={false}
              />
            )}
            {/* Text Elements */}
            {textElements.map((element) => (
              <TextElementComponent
                key={element.id}
                element={element}
                isSelected={selectedTextElementId === element.id}
                onSelect={() => handleTextElementSelect(element.id)}
                onDragEnd={handleTextElementDragEnd}
                onTextChange={handleTextElementTextChange}
                onEditStateChange={handleTextElementEditStateChange}
              />
            ))}
            {/* Post-It Elements */}
            {postItElements.map((element) => (
              <PostItElementComponent
                key={element.id}
                element={element}
                isSelected={selectedPostItElementId === element.id}
                onSelect={() => handlePostItElementSelect(element.id)}
                onDragEnd={handlePostItElementDragEnd}
                onTextChange={handlePostItElementTextChange}
                onEditStateChange={handlePostItElementEditStateChange}
              />
            ))}
          </Layer>
        </Stage>
      )}

      {/* Add to Saved Cards Confirmation Dialog */}
      <AlertDialog open={showAddToFrequentlyUsedDialog} onOpenChange={setShowAddToFrequentlyUsedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('addToSavedCards') || 'Save Card'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('addToSavedCardsConfirm') || 'Are you sure you want to save this card to your saved cards folder?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowAddToFrequentlyUsedDialog(false);
              setCardToAddToFrequentlyUsed(null);
            }}>
              {t('cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddToSavedCards}>
              {t('confirm') || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

