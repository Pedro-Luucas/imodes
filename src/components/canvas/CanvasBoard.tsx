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
}

interface WindowWithCanvasCard extends Window {
  _addCanvasCard?: (card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
}

const CARD_COLORS = [
  '#0ea5e9', // sky
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#6366f1', // indigo
];

export function CanvasBoard({ onAddCard: _onAddCard, scale = 1, gender = 'male', toolMode = 'select' }: CanvasBoardProps) {
  const t = useTranslations('canvas.card');
  const [cards, setCards] = useState<CanvasCardType[]>([]);
  const [notes, setNotes] = useState<PostItNote[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(scale);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScaleRef = useRef<number>(scale);
  const stagePositionRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Initialize prevScaleRef on mount
  useEffect(() => {
    prevScaleRef.current = scale;
    setDisplayScale(scale);
  }, [scale]);

  // Keep ref in sync with state
  useEffect(() => {
    stagePositionRef.current = stagePosition;
  }, [stagePosition]);

  // Set initialized after a short delay to show loading screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
    console.error = (...args: any[]) => {
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
        imageUrl: cardData?.imageUrl,
        category: cardData?.category,
        cardNumber: cardData?.cardNumber,
        gender: gender,
      };

      setCards((prev) => [...prev, newCard]);
      setSelectedCardId(cardId);
      // TODO: Supabase Realtime - broadcast card creation event
    };

    // Expose method globally for parent to call
    const win = window as WindowWithCanvasCard;
    win._addCanvasCard = handleAddCard;

    return () => {
      delete win._addCanvasCard;
    };
  }, [cards.length, gender, dimensions.width, dimensions.height, displayScale, t]);

  const handleCardDragEnd = useCallback((id: string, x: number, y: number) => {
    setCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, x, y } : card))
    );
    // TODO: Supabase Realtime - broadcast card position update event
  }, []);

  const handleCardDelete = useCallback((id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
    if (selectedCardId === id) {
      setSelectedCardId(null);
    }
    // TODO: Supabase Realtime - broadcast card deletion event
  }, [selectedCardId]);

  const handleCardLockToggle = useCallback((id: string) => {
    setCards((prev) =>
      prev.map((card) => 
        card.id === id ? { ...card, locked: !card.locked } : card
      )
    );
    // TODO: Supabase Realtime - broadcast card lock update event
  }, []);

  const handleCardSizeChange = useCallback((id: string, width: number, height: number) => {
    setCards((prev) =>
      prev.map((card) => 
        card.id === id ? { ...card, width, height } : card
      )
    );
    // TODO: Supabase Realtime - broadcast card size update event
  }, []);

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
      
      setNotes((prev) => [...prev, newNote]);
      setSelectedNoteId(newNote.id);
      setSelectedCardId(null);
      return;
    }
    
    // Deselect when clicking on empty canvas
    if (e.target === stage) {
      setSelectedCardId(null);
      setSelectedNoteId(null);
    }
  }, [toolMode, displayScale]);

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
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, x, y } : note))
    );
  }, []);

  const handleNoteTextChange = useCallback((id: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text } : note))
    );
  }, []);

  const handleNoteEditStateChange = useCallback((id: string, isEditing: boolean) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, isEditing } : note))
    );
  }, []);

  const handleNoteSizeChange = useCallback((id: string, width: number, height: number) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, width, height } : note))
    );
  }, []);

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
        setNotes((prev) => prev.filter((note) => note.id !== selectedNoteId));
        setSelectedNoteId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardId, selectedNoteId]);

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
      {!isInitialized && <CanvasLoading />}
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
                onSizeChange={handleCardSizeChange}
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
    </div>
  );
}

