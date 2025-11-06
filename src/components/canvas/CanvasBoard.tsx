'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { toast } from 'sonner';
import { CanvasCard as CanvasCardType, Gender, CardCategory, ToolMode, PostItNote } from '@/types/canvas';
import { CanvasCard } from './CanvasCard';
import { CanvasLoading } from './CanvasLoading';
import { PostItNoteComponent } from './PostItNote';
import { serializeCanvasState, deserializeCanvasState } from '@/lib/canvasSerialization';
import { preloadImagesWithPriority } from '@/lib/imagePreloader';
import { saveCard } from '@/lib/savedCardsTracker';
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
}

interface CanvasStateSnapshot {
  cards: CanvasCardType[];
  notes: PostItNote[];
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

export function CanvasBoard({ 
  scale = 1, 
  gender = 'male', 
  toolMode = 'select',
  sessionId,
  userRole,
  onZoomChange,
}: CanvasBoardProps) {
  const t = useTranslations('canvas.card');
  const [cards, setCards] = useState<CanvasCardType[]>([]);
  const [notes, setNotes] = useState<PostItNote[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(scale);
  const [currentGender, setCurrentGender] = useState<Gender>(gender);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [showAddToFrequentlyUsedDialog, setShowAddToFrequentlyUsedDialog] = useState(false);
  const [cardToAddToFrequentlyUsed, setCardToAddToFrequentlyUsed] = useState<CanvasCardType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScaleRef = useRef<number>(scale);
  const stagePositionRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const patientZoomRef = useRef<number>(100);
  const therapistZoomRef = useRef<number>(100);
  const therapistNotesRef = useRef<string | undefined>(undefined);
  const historyRef = useRef<CanvasStateSnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);
  const dragDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardsRef = useRef<CanvasCardType[]>([]);
  const notesRef = useRef<PostItNote[]>([]);
  const MAX_HISTORY_SIZE = 50;

  // Keep refs in sync with state
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return; // Don't save during undo/redo operations

    const snapshot: CanvasStateSnapshot = {
      cards: cardsRef.current.map(card => ({ ...card })),
      notes: notesRef.current.map(note => ({ ...note })),
    };

    // Remove any history after current index (when user did new action after undo)
    const currentIndex = historyIndexRef.current;
    if (currentIndex < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndex + 1);
    }

    // Add new snapshot
    historyRef.current.push(snapshot);
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  // Restore state from history
  const restoreFromHistory = useCallback((snapshot: CanvasStateSnapshot) => {
    isUndoRedoRef.current = true;
    setCards(snapshot.cards.map(card => ({ ...card })));
    setNotes(snapshot.notes.map(note => ({ ...note })));
    setSelectedCardId(null);
    setSelectedNoteId(null);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, []);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const snapshot = historyRef.current[historyIndexRef.current];
      if (snapshot) {
        restoreFromHistory(snapshot);
      }
    }
  }, [restoreFromHistory]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const snapshot = historyRef.current[historyIndexRef.current];
      if (snapshot) {
        restoreFromHistory(snapshot);
      }
    }
  }, [restoreFromHistory]);

  // Update gender state when prop changes
  useEffect(() => {
    setCurrentGender(gender);
  }, [gender]);

  // Initialize prevScaleRef on mount
  useEffect(() => {
    prevScaleRef.current = scale;
    setDisplayScale(scale);
    // Update zoom refs based on user role
    if (userRole === 'patient') {
      patientZoomRef.current = scale * 100;
    } else if (userRole === 'therapist') {
      therapistZoomRef.current = scale * 100;
    }
  }, [scale, userRole]);

  // Keep ref in sync with state
  useEffect(() => {
    stagePositionRef.current = stagePosition;
  }, [stagePosition]);

  // Load session data when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setIsInitialized(true);
      return;
    }

    const loadSession = async () => {
      setIsLoadingSession(true);
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to load session');
        }
        const data = await response.json();
        const session = data.session;

        if (session?.data) {
          const { cards: loadedCards, gender: loadedGender, patientZoomLevel, therapistZoomLevel, therapistNotes } = 
            deserializeCanvasState(session.data);

          // Set cards immediately so they can start rendering
          setCards(loadedCards);
          setCurrentGender(loadedGender);
          patientZoomRef.current = patientZoomLevel;
          therapistZoomRef.current = therapistZoomLevel;
          therapistNotesRef.current = therapistNotes;

          // Reset history when loading a session - initialize with loaded state
          const initialSnapshot: CanvasStateSnapshot = {
            cards: loadedCards.map(card => ({ ...card })),
            notes: [],
          };
          historyRef.current = [initialSnapshot];
          historyIndexRef.current = 0;

          // Set zoom level based on user role
          let zoomToSet: number;
          if (userRole === 'patient') {
            zoomToSet = patientZoomLevel;
            setDisplayScale(patientZoomLevel / 100);
            prevScaleRef.current = patientZoomLevel / 100;
          } else if (userRole === 'therapist') {
            zoomToSet = therapistZoomLevel;
            setDisplayScale(therapistZoomLevel / 100);
            prevScaleRef.current = therapistZoomLevel / 100;
          } else {
            zoomToSet = 100;
          }

          // Notify parent of zoom change
          if (onZoomChange && zoomToSet) {
            onZoomChange(zoomToSet);
          }

          // Extract image URLs from cards on canvas and preload them (priority)
          // This happens after setting cards so canvas renders immediately
          const canvasImageUrls = loadedCards
            .map(card => card.imageUrl)
            .filter((url): url is string => !!url);

          // Preload canvas images in the background (don't await - let them load while canvas renders)
          // Browser will prioritize these requests over other requests
          preloadImagesWithPriority(canvasImageUrls).catch(() => {
            // Ignore errors - images will load naturally when CanvasCard components request them
          });
        }
      } catch (error) {
        console.error('Error loading session:', error);
        toast.error('Failed to load session');
        setIsLoadingSession(false);
        setIsInitialized(true);
      } finally {
        setIsLoadingSession(false);
        // Set initialized after loading
        setTimeout(() => {
          setIsInitialized(true);
        }, 500);
      }
    };

    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userRole]);

  // Set initialized after a short delay to show loading screen (if no session to load)
  useEffect(() => {
    if (!sessionId && !isLoadingSession) {
      const timer = setTimeout(() => {
        setIsInitialized(true);
        // Initialize history with empty state
        const initialSnapshot: CanvasStateSnapshot = {
          cards: [],
          notes: [],
        };
        historyRef.current = [initialSnapshot];
        historyIndexRef.current = 0;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sessionId, isLoadingSession]);

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

  // Handle zoom centering on selected card or viewport center
  useEffect(() => {
    if (prevScaleRef.current === scale) return;

    const oldScale = prevScaleRef.current;
    const newScale = scale;
    
    // Calculate the new position first
    let centerX: number;
    let centerY: number;

    // Determine center point: selected card center or viewport center
    if (selectedCardId) {
      const selectedCard = cards.find(card => card.id === selectedCardId);
      if (selectedCard) {
        // Center of the selected card (in stage coordinates)
        centerX = selectedCard.x + selectedCard.width / 2;
        centerY = selectedCard.y + selectedCard.height / 2;
      } else {
        // Fallback to viewport center if card not found
        // Convert viewport center from screen coords to stage coords
        centerX = (dimensions.width / 2 - stagePositionRef.current.x) / oldScale;
        centerY = (dimensions.height / 2 - stagePositionRef.current.y) / oldScale;
      }
    } else {
      // Viewport center when no card is selected
      // Convert viewport center from screen coords to stage coords
      centerX = (dimensions.width / 2 - stagePositionRef.current.x) / oldScale;
      centerY = (dimensions.height / 2 - stagePositionRef.current.y) / oldScale;
    }

    // Calculate new stage position to keep the center point visually fixed
    // Formula: newPos = oldPos + center * (oldScale - newScale)
    const newPosition = {
      x: stagePositionRef.current.x + centerX * (oldScale - newScale),
      y: stagePositionRef.current.y + centerY * (oldScale - newScale),
    };

    // Cancel any pending RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    // Use requestAnimationFrame to batch scale and position updates in the same frame
    // This prevents flickering by ensuring both update together
    rafRef.current = requestAnimationFrame(() => {
      // Update both scale and position in the same frame
      setDisplayScale(newScale);
      setStagePosition(newPosition);
      prevScaleRef.current = newScale;
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scale, selectedCardId, cards, dimensions.width, dimensions.height]);

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
      
      // Calculate center of viewport in stage coordinates
      // Account for current stage position and scale
      const cardWidth = 280;
      const cardHeight = 320;
      
      // Viewport center in screen coordinates
      const viewportCenterX = dimensions.width / 2;
      const viewportCenterY = dimensions.height / 2;
      
      // Convert to stage coordinates
      // Formula: stageCoord = (screenCoord - stagePosition) / scale
      const centerX = (viewportCenterX - stagePositionRef.current.x) / displayScale;
      const centerY = (viewportCenterY - stagePositionRef.current.y) / displayScale;
      
      // Position card so its center is at viewport center
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

      setCards((prev) => {
        const newCards = [...prev, newCard];
        // Save to history after state update
        setTimeout(() => saveToHistory(), 0);
        return newCards;
      });
      // Don't auto-select newly spawned cards
      // TODO: Supabase Realtime - broadcast card creation event
    };

    // Expose method globally for parent to call
    const win = window as WindowWithCanvasCard;
    win._addCanvasCard = handleAddCard;

    return () => {
      delete win._addCanvasCard;
    };
  }, [cards.length, currentGender, dimensions.width, dimensions.height, displayScale, t, saveToHistory]);

  // Clear canvas functionality - exposed via global method
  useEffect(() => {
    const handleClearCanvas = () => {
      // Save current state before clearing
      saveToHistory();
      setCards([]);
      setNotes([]);
      setSelectedCardId(null);
      setSelectedNoteId(null);
      // TODO: Supabase Realtime - broadcast canvas clear event
    };

    // Expose method globally for parent to call
    const win = window as WindowWithCanvasCard;
    win._clearCanvas = handleClearCanvas;

    return () => {
      delete win._clearCanvas;
    };
  }, [saveToHistory]);

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

  const handleCardDragEnd = useCallback((id: string, x: number, y: number) => {
    setCards((prev) => {
      const updated = prev.map((card) => (card.id === id ? { ...card, x, y } : card));
      // Debounce history save for drag operations to avoid too many snapshots
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
      return updated;
    });
    // TODO: Supabase Realtime - broadcast card position update event
  }, [saveToHistory]);

  const handleCardDelete = useCallback((id: string) => {
    setCards((prev) => {
      const updated = prev.filter((card) => card.id !== id);
      // Save to history after state update
      setTimeout(() => saveToHistory(), 0);
      return updated;
    });
    if (selectedCardId === id) {
      setSelectedCardId(null);
    }
    // TODO: Supabase Realtime - broadcast card deletion event
  }, [selectedCardId, saveToHistory]);

  const handleCardLockToggle = useCallback((id: string) => {
    setCards((prev) => {
      const updated = prev.map((card) => 
        card.id === id ? { ...card, locked: !card.locked } : card
      );
      // Save to history after state update
      setTimeout(() => saveToHistory(), 0);
      return updated;
    });
    // TODO: Supabase Realtime - broadcast card lock update event
  }, [saveToHistory]);

  const handleCardSizeChange = useCallback((id: string, width: number, height: number) => {
    setCards((prev) => {
      const updated = prev.map((card) => 
        card.id === id ? { ...card, width, height } : card
      );
      // Debounce history save for resize operations
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
      return updated;
    });
    // TODO: Supabase Realtime - broadcast card size update event
  }, [saveToHistory]);

  const handleCardRotationChange = useCallback((id: string, rotation: number) => {
    setCards((prev) => {
      const updated = prev.map((card) => 
        card.id === id ? { ...card, rotation } : card
      );
      // Debounce history save for rotation operations
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
      return updated;
    });
    // TODO: Supabase Realtime - broadcast card rotation update event
  }, [saveToHistory]);

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

  const handleCardSelect = useCallback((id: string) => {
    setSelectedCardId(id);
    
    // Bring selected card to front by moving it to end of array
    setCards((prev) => {
      const cardIndex = prev.findIndex((card) => card.id === id);
      if (cardIndex === -1 || cardIndex === prev.length - 1) return prev;
      
      const newCards = [...prev];
      const [selectedCard] = newCards.splice(cardIndex, 1);
      newCards.push(selectedCard);
      return newCards;
    });
  }, []);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Handle text tool - create new post-it note
    if (toolMode === 'text' && e.target === stage) {
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      const stageX = (pointerPos.x - stagePositionRef.current.x) / displayScale;
      const stageY = (pointerPos.y - stagePositionRef.current.y) / displayScale;
      
      const noteWidth = 142;
      const noteHeight = 100; // Initial height, will adjust with content
      
      const newNote: PostItNote = {
        id: Date.now().toString(),
        x: stageX - noteWidth / 2, // Center at click position
        y: stageY - noteHeight / 2,
        text: '',
        width: noteWidth,
        height: noteHeight,
        isEditing: true,
      };
      
      setNotes((prev) => {
        const updated = [...prev, newNote];
        // Save to history after state update
        setTimeout(() => saveToHistory(), 0);
        return updated;
      });
      setSelectedNoteId(newNote.id);
      setSelectedCardId(null);
      return;
    }
    
    // Deselect when clicking on empty canvas
    if (e.target === stage) {
      setSelectedCardId(null);
      setSelectedNoteId(null);
    }
  }, [toolMode, displayScale, saveToHistory]);

  const handleNoteSelect = useCallback((id: string) => {
    setSelectedNoteId(id);
    setSelectedCardId(null);
    
    // Bring selected note to front
    setNotes((prev) => {
      const noteIndex = prev.findIndex((note) => note.id === id);
      if (noteIndex === -1 || noteIndex === prev.length - 1) return prev;
      
      const newNotes = [...prev];
      const [selectedNote] = newNotes.splice(noteIndex, 1);
      newNotes.push(selectedNote);
      return newNotes;
    });
  }, []);

  const handleNoteDragEnd = useCallback((id: string, x: number, y: number) => {
    setNotes((prev) => {
      const updated = prev.map((note) => (note.id === id ? { ...note, x, y } : note));
      // Debounce history save for drag operations
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
      return updated;
    });
  }, [saveToHistory]);

  const handleNoteTextChange = useCallback((id: string, text: string) => {
    setNotes((prev) => {
      const updated = prev.map((note) => (note.id === id ? { ...note, text } : note));
      // Debounce history save for text changes
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveToHistory();
      }, 500);
      return updated;
    });
  }, [saveToHistory]);

  const handleNoteEditStateChange = useCallback((id: string, isEditing: boolean) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, isEditing } : note))
    );
  }, []);

  const handleNoteSizeChange = useCallback((id: string, width: number, height: number) => {
    setNotes((prev) => {
      const updated = prev.map((note) => (note.id === id ? { ...note, width, height } : note));
      // Debounce history save for resize operations
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
      dragDebounceTimerRef.current = setTimeout(() => {
        saveToHistory();
      }, 300);
      return updated;
    });
  }, [saveToHistory]);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!sessionId) return;

    const saveSession = async () => {
      try {
        const currentZoom = displayScale * 100;
        // Update zoom refs based on user role
        if (userRole === 'patient') {
          patientZoomRef.current = currentZoom;
        } else if (userRole === 'therapist') {
          therapistZoomRef.current = currentZoom;
        }

        const canvasState = serializeCanvasState(
          cards,
          currentGender,
          patientZoomRef.current,
          therapistZoomRef.current,
          therapistNotesRef.current
        );

        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: canvasState }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Auto-save session error:', errorData);
          throw new Error(errorData.error || 'Failed to save session');
        }
      } catch (error) {
        console.error('Error auto-saving session:', error);
        // Don't show toast for auto-save errors to avoid spam
      }
    };

    autoSaveIntervalRef.current = setInterval(saveSession, 5000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [sessionId, cards, currentGender, displayScale, userRole]);

  // Expose manual save function via window object for parent to call
  useEffect(() => {
    const manualSave = async () => {
      if (!sessionId) {
        throw new Error('No session to save');
      }

      const currentZoom = displayScale * 100;
      // Update zoom refs based on user role
      if (userRole === 'patient') {
        patientZoomRef.current = currentZoom;
      } else if (userRole === 'therapist') {
        therapistZoomRef.current = currentZoom;
      }

      const canvasState = serializeCanvasState(
        cards,
        currentGender,
        patientZoomRef.current,
        therapistZoomRef.current
      );

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: canvasState }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save session error:', errorData);
        throw new Error(errorData.error || 'Failed to save session');
      }
    };

    // Store the function so parent can access it
    const win = window as WindowWithCanvasCard;
    win._manualSaveCanvas = manualSave;

    return () => {
      delete win._manualSaveCanvas;
    };
  }, [sessionId, cards, currentGender, displayScale, userRole]);

  // Delete selected note on Delete/Backspace key (but not cards)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only delete notes, not cards
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId && !selectedCardId) {
        // Check if user is typing in an input/textarea - don't delete in that case
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        setNotes((prev) => {
          const updated = prev.filter((note) => note.id !== selectedNoteId);
          // Save to history after state update
          setTimeout(() => saveToHistory(), 0);
          return updated;
        });
        setSelectedNoteId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardId, selectedNoteId, cards, saveToHistory]);

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
      {(!isInitialized || isLoadingSession) && <CanvasLoading />}
      {isInitialized && dimensions.width > 0 && (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          x={stagePosition.x}
          y={stagePosition.y}
          scaleX={displayScale}
          scaleY={displayScale}
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
                onRotationChange={handleCardRotationChange}
              />
            ))}
            {notes.map((note) => (
              <PostItNoteComponent
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                onSelect={() => handleNoteSelect(note.id)}
                onDragEnd={handleNoteDragEnd}
                onTextChange={handleNoteTextChange}
                onEditStateChange={handleNoteEditStateChange}
                onSizeChange={handleNoteSizeChange}
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

