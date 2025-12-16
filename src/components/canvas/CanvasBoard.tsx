'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { toast } from 'sonner';
import {
  CanvasCard as CanvasCardType,
  Gender,
  CardCategory,
  ToolMode,
  // PostItNote,
} from '@/types/canvas';
import { CanvasCard } from './CanvasCard';
import { CanvasLoading } from './CanvasLoading';
//import { PostItNoteComponent } from './PostItNote';
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
}: CanvasBoardProps) {
  const t = useTranslations('canvas.card');
  const cards = useCanvasStore((state) => state.cards);
  //const notes = useCanvasStore((state) => state.notes);
  const selectedCardId = useCanvasStore((state) => state.selectedCardId);
  //const selectedNoteId = useCanvasStore((state) => state.selectedNoteId);
  const displayScale = useCanvasStore((state) => state.displayScale);
  const stagePosition = useCanvasStore((state) => state.stagePosition);
  const currentGender = useCanvasStore((state) => state.gender);
  const isHydrated = useCanvasStore((state) => state.isHydrated);
  const lastSavedVersion = useCanvasStore((state) => state.lastSavedVersion);

  const storeActionsRef = useRef(canvasStore.getState());
  const {
    addCard,
    updateCard,
    removeCard,
    //addNote,
    //updateNote,
    //removeNote,
    //bringNoteToFront,
    clearCanvas,
    bringCardToFront,
    selectCard,
    selectNote,
    setDisplayScale,
    setStagePosition,
    setZoomLevel,
    setGender,
    saveHistorySnapshot,
    undo,
    redo,
    markDirty,
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

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

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

      let centerX: number;
      let centerY: number;

      if (viewportWidth > 0 && viewportHeight > 0) {
        // Viewport center in screen coordinates
        const viewportCenterX = viewportWidth / 2;
        const viewportCenterY = viewportHeight / 2;

        // Convert to stage coordinates
        centerX = (viewportCenterX - stagePos.x) / scale;
        centerY = (viewportCenterY - stagePos.y) / scale;
      } else {
        // Fallback to keeping relative to current stage origin if dimensions are unavailable
        centerX = -stagePos.x / scale;
        centerY = -stagePos.y / scale;
      }

      // Position card so its center is at the computed center
      const cardX = centerX - cardWidth / 2;
      const cardY = centerY - cardHeight / 2;
      
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

  const handleCardRotationChange = useCallback(
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
  );

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
    if (e.target !== e.target.getStage()) return;
    if (e.evt.button !== 0) return;
    e.evt.preventDefault();
    startCanvasPan(e.evt.clientX, e.evt.clientY);
  }, [startCanvasPan]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanningRef.current) return;
    moveCanvasPan(e.evt.clientX, e.evt.clientY);
  }, [moveCanvasPan]);

  const handleStageMouseUp = useCallback(() => {
    stopCanvasPan();
  }, [stopCanvasPan]);

  const handleStageMouseLeave = useCallback(() => {
    stopCanvasPan();
  }, [stopCanvasPan]);

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
  }, [startCanvasPan, getTouchDistance, getTouchCenter, displayScale]);

  const handleStageTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
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
  }, [moveCanvasPan, getTouchDistance, getTouchCenter, displayScale, onZoomChange, setDisplayScale, setStagePosition, setZoomLevel, userRole]);

  const handleStageTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
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
    stopCanvasPan();
  }, [stopCanvasPan, startCanvasPan]);

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

      // if (toolMode === 'text' && e.target === stage) {
      //   const pointerPos = stage.getPointerPosition();
      //   if (!pointerPos) return;
      //   const stageX = (pointerPos.x - stagePositionRef.current.x) / displayScale;
      //   const stageY = (pointerPos.y - stagePositionRef.current.y) / displayScale;
      //
      //   const noteWidth = 142;
      //   const noteHeight = 100;
      //
      //   const newNote: PostItNote = {
      //     id: Date.now().toString(),
      //     x: stageX - noteWidth / 2,
      //     y: stageY - noteHeight / 2,
      //     text: '',
      //     width: noteWidth,
      //     height: noteHeight,
      //     isEditing: true,
      //   };
      //
      //   addNote(newNote);
      //   selectNote(newNote.id);
      //   selectCard(null);
      //   markDirty('interaction');
      //
      //   if (sessionId) {
      //     void publish('note.add', { note: newNote });
      //   }
      //   return;
      // }

      if (e.target === stage) {
        selectCard(null);
        selectNote(null);
      }

      // Notify parent of rapid click (not a drag) on canvas
      onCanvasClick?.();
  },
    [
      // addNote,
      // displayScale,
      // markDirty,
      // publish,
      selectCard,
      selectNote,
      // sessionId,
      // toolMode,
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

  // const handleNoteSelect = useCallback(
  //   (id: string) => {
  //     selectNote(id);
  //     selectCard(null);
  //     bringNoteToFront(id, { skipHistory: true });
  //   },
  //   [bringNoteToFront, selectCard, selectNote]
  // );
  //
  // const handleNoteDragEnd = useCallback(
  //   (id: string, x: number, y: number) => {
  //     updateNote(id, { x, y }, { skipHistory: true });
  //
  //     if (dragDebounceTimerRef.current) {
  //       clearTimeout(dragDebounceTimerRef.current);
  //     }
  //     dragDebounceTimerRef.current = setTimeout(() => {
  //       saveHistorySnapshot();
  //     }, 300);
  //
  //     markDirty('interaction');
  //
  //     if (sessionId) {
  //       void publish('note.patch', { id, patch: { x, y } });
  //     }
  //   },
  //   [markDirty, publish, saveHistorySnapshot, sessionId, updateNote]
  // );
  //
  // const handleNoteTextChange = useCallback(
  //   (id: string, text: string) => {
  //     updateNote(id, { text }, { skipHistory: true });
  //
  //     if (dragDebounceTimerRef.current) {
  //       clearTimeout(dragDebounceTimerRef.current);
  //     }
  //     dragDebounceTimerRef.current = setTimeout(() => {
  //       saveHistorySnapshot();
  //     }, 500);
  //
  //     markDirty('interaction');
  //
  //     if (sessionId) {
  //       void publish('note.patch', { id, patch: { text } });
  //     }
  //   },
  //   [markDirty, publish, saveHistorySnapshot, sessionId, updateNote]
  // );
  //
  // const handleNoteEditStateChange = useCallback(
  //   (id: string, isEditing: boolean) => {
  //     updateNote(id, { isEditing }, { skipHistory: true });
  //   },
  //   [updateNote]
  // );
  //
  // const handleNoteSizeChange = useCallback(
  //   (id: string, width: number, height: number) => {
  //     updateNote(id, { width, height }, { skipHistory: true });
  //
  //     if (dragDebounceTimerRef.current) {
  //       clearTimeout(dragDebounceTimerRef.current);
  //     }
  //     dragDebounceTimerRef.current = setTimeout(() => {
  //       saveHistorySnapshot();
  //     }, 300);
  //
  //     markDirty('interaction');
  //
  //     if (sessionId) {
  //       void publish('note.patch', { id, patch: { width, height } });
  //     }
  //   },
  //   [markDirty, publish, saveHistorySnapshot, sessionId, updateNote]
  // );
  //
  // // Delete selected note on Delete/Backspace key (but not cards)
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     // Only delete notes, not cards
  //     if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId && !selectedCardId) {
  //       // Check if user is typing in an input/textarea - don't delete in that case
  //       const activeElement = document.activeElement;
  //       if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
  //         return;
  //       }
  //       removeNote(selectedNoteId);
  //       selectNote(null);
  //       markDirty('interaction');
  //
  //       if (sessionId) {
  //         void publish('note.remove', { id: selectedNoteId });
  //       }
  //     }
  //   };
  //
  //   window.addEventListener('keydown', handleKeyDown);
  //   return () => window.removeEventListener('keydown', handleKeyDown);
  // }, [
  //   markDirty,
  //   publish,
  //   removeNote,
  //   selectedCardId,
  //   selectedNoteId,
  //   selectNote,
  //   sessionId,
  // ]);

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
          width={dimensions.width}
          height={dimensions.height}
          x={stagePosition.x}
          y={stagePosition.y}
          scaleX={displayScale}
          scaleY={displayScale}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
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
            {/*
            // {notes.map((note) => (
            //   <PostItNoteComponent
            //     key={note.id}
            //     note={note}
            //     isSelected={selectedNoteId === note.id}
            //     onSelect={() => handleNoteSelect(note.id)}
            //     onDragEnd={handleNoteDragEnd}
            //     onTextChange={handleNoteTextChange}
            //     onEditStateChange={handleNoteEditStateChange}
            //     onSizeChange={handleNoteSizeChange}
            //   />
            // ))}
            */}
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

