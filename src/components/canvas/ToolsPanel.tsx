'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Smile,
  Zap,
  Waves,
  Clock,
  FolderOpen,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { useCardsData } from '@/hooks/useCardsData';
import { useIsMobile } from '@/hooks/useIsMobile';
import { CardCategory, Gender } from '@/types/canvas';
import { trackCardUsage, getFrequentlyUsedCards, type CardUsage } from '@/lib/cardUsageTracker';
import { getSavedCards, removeSavedCard, type SavedCard } from '@/lib/savedCardsTracker';

// Reusable card image component with error fallback
function CardImage({ 
  src, 
  alt, 
  fallbackText 
}: { 
  src?: string; 
  alt: string; 
  fallbackText: string;
}) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs text-center p-2">
        {fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={160}
      height={160}
      className="w-full h-full object-cover"
      style={{
        imageRendering: 'auto',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
      loading="lazy"
      onError={handleError}
    />
  );
}

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gender: Gender;
  locale: string;
  onCardSelect?: (card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
}

// Separate component for card grid to ensure hooks are called at top level
function CardsGrid({ 
  category, 
  genderFilter, 
  locale, 
  onCardSelect,
  isMobile 
}: { 
  category: CardCategory; 
  genderFilter?: Gender; 
  locale: string;
  onCardSelect?: (card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  isMobile: boolean;
}) {
  const categoryGender = category === 'boat' || category === 'wave' ? undefined : genderFilter;
  const { cards, loading, error } = useCardsData(category, categoryGender, locale);

  const handleCardClick = useCallback((card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => {
    // Track card usage
    trackCardUsage(card);
    // Call the original onCardSelect callback
    onCardSelect?.(card);
  }, [onCardSelect]);

  return (
    <div className="absolute left-full top-0 ml-3 w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-stroke bg-white p-3 shadow-lg sm:w-72 md:ml-4 md:w-96 md:max-h-[600px] md:p-4 lg:w-[480px]">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 md:h-6 md:w-6" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8 text-xs text-red-500 md:text-sm">
          {error}
        </div>
      ) : (
        <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 gap-3'}`}>
          {cards.map((card) => (
            <div
              key={card.path}
              className="aspect-square rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-gray-100"
              onClick={() => handleCardClick({
                imageUrl: card.imageUrl,
                title: card.name,
                description: card.description,
                category: card.category,
                cardNumber: card.cardNumber,
              })}
            >
              <CardImage 
                src={card.imageUrl} 
                alt={card.name} 
                fallbackText={card.name} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Component to display frequently used cards
function FrequentlyUsedCards({ 
  onCardSelect,
  isExpanded,
  isMobile
}: { 
  onCardSelect?: (card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  isExpanded?: boolean;
  isMobile: boolean;
}) {
  const t = useTranslations('canvas.tools');
  const [frequentCards, setFrequentCards] = useState<CardUsage[]>([]);

  const refreshCards = useCallback(() => {
    const cards = getFrequentlyUsedCards();
    setFrequentCards(cards);
  }, []);

  useEffect(() => {
    // Load frequently used cards
    refreshCards();
  }, [refreshCards]);

  // Refresh when section is expanded
  useEffect(() => {
    if (isExpanded) {
      refreshCards();
    }
  }, [isExpanded, refreshCards]);

  // Listen for storage changes to update the list when cards are used
  useEffect(() => {
    // Listen for custom event that we'll dispatch when tracking usage
    window.addEventListener('cardUsageUpdated', refreshCards);

    return () => {
      window.removeEventListener('cardUsageUpdated', refreshCards);
    };
  }, [refreshCards]);

  const handleCardClick = useCallback((cardUsage: CardUsage) => {
    // Track card usage again (increment count)
    trackCardUsage({
      cardNumber: cardUsage.cardNumber,
      category: cardUsage.category,
      imageUrl: cardUsage.imageUrl,
      title: cardUsage.title,
      description: cardUsage.description,
    });
    // Dispatch event to update the list
    window.dispatchEvent(new Event('cardUsageUpdated'));
    // Call the original onCardSelect callback
    onCardSelect?.({
      imageUrl: cardUsage.imageUrl,
      title: cardUsage.title,
      description: cardUsage.description,
      category: cardUsage.category,
      cardNumber: cardUsage.cardNumber,
    });
  }, [onCardSelect]);

  if (frequentCards.length === 0) {
    return (
      <div className="absolute left-full top-0 ml-3 w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-stroke bg-white p-3 shadow-lg sm:w-72 md:ml-4 md:w-96 md:max-h-[600px] md:p-4 lg:w-[480px]">
        <div className="py-8 text-center text-xs text-gray-500 md:text-sm">{t('noFrequentlyUsed')}</div>
      </div>
    );
  }

  return (
    <div className="absolute left-full top-0 ml-3 w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-stroke bg-white p-3 shadow-lg sm:w-72 md:ml-4 md:w-96 md:max-h-[600px] md:p-4 lg:w-[480px]">
      <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 gap-3'}`}>
        {frequentCards.map((cardUsage) => (
          <div
            key={`${cardUsage.category}-${cardUsage.cardNumber}`}
            className="aspect-square rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-gray-100"
            onClick={() => handleCardClick(cardUsage)}
          >
            <CardImage 
              src={cardUsage.imageUrl} 
              alt={cardUsage.title} 
              fallbackText={cardUsage.title} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Component to display saved cards
function SavedCards({ 
  onCardSelect,
  isExpanded,
  isMobile
}: { 
  onCardSelect?: (card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  isExpanded?: boolean;
  isMobile: boolean;
}) {
  const t = useTranslations('canvas.tools');
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  const refreshCards = useCallback(() => {
    const cards = getSavedCards();
    setSavedCards(cards);
  }, []);

  useEffect(() => {
    // Load saved cards
    refreshCards();
  }, [refreshCards]);

  // Refresh when section is expanded
  useEffect(() => {
    if (isExpanded) {
      refreshCards();
    }
  }, [isExpanded, refreshCards]);

  // Listen for storage changes to update the list when cards are saved
  useEffect(() => {
    // Listen for custom event that we'll dispatch when saving cards
    window.addEventListener('savedCardsUpdated', refreshCards);

    return () => {
      window.removeEventListener('savedCardsUpdated', refreshCards);
    };
  }, [refreshCards]);

  const handleCardClick = useCallback((savedCard: SavedCard) => {
    // Track card usage when clicking from saved cards
    trackCardUsage({
      cardNumber: savedCard.cardNumber,
      category: savedCard.category,
      imageUrl: savedCard.imageUrl,
      title: savedCard.title,
      description: savedCard.description,
    });
    // Call the original onCardSelect callback
    onCardSelect?.({
      imageUrl: savedCard.imageUrl,
      title: savedCard.title,
      description: savedCard.description,
      category: savedCard.category,
      cardNumber: savedCard.cardNumber,
    });
  }, [onCardSelect]);

  if (savedCards.length === 0) {
    return (
      <div className="absolute left-full top-0 ml-3 w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-stroke bg-white p-3 shadow-lg sm:w-72 md:ml-4 md:w-96 md:max-h-[600px] md:p-4 lg:w-[480px]">
        <div className="py-8 text-center text-xs text-gray-500 md:text-sm">{t('noSavedCards')}</div>
      </div>
    );
  }

  return (
    <div className="absolute left-full top-0 ml-3 w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-stroke bg-white p-3 shadow-lg sm:w-72 md:ml-4 md:w-96 md:max-h-[600px] md:p-4 lg:w-[480px]">
      <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 gap-3'}`}>
        {savedCards.map((savedCard) => (
          <div
            key={`${savedCard.category}-${savedCard.cardNumber}`}
            className="aspect-square rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-gray-100 relative group"
            onClick={() => handleCardClick(savedCard)}
          >
            <CardImage 
              src={savedCard.imageUrl} 
              alt={savedCard.title} 
              fallbackText={savedCard.title} 
            />
            {/* Remove button on hover */}
            <button
              className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 md:right-2 md:top-2 md:p-1.5"
              onClick={(e) => {
                e.stopPropagation();
                removeSavedCard(savedCard.cardNumber, savedCard.category);
              }}
              title={t('removeFromSaved') || 'Remove from saved'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ToolsPanel({ isOpen, onClose, gender, locale, onCardSelect }: ToolsPanelProps) {
  const t = useTranslations('canvas.tools');
  const isMobile = useIsMobile();
  const [expandedSection, setExpandedSection] = useState<string | null>('modes');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Wrap onCardSelect to collapse the panel on mobile after selecting a card
  const handleCardSelect = useCallback((card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => {
    onCardSelect?.(card);
    if (isMobile) {
      onClose();
    }
  }, [onCardSelect, isMobile, onClose]);

  // Always render all card grids to ensure hooks are called consistently
  // Hide them with CSS when not expanded - this ensures hooks run every render
  const cardGrids = (
    <>
      <div className={expandedSection === 'modes' ? '' : 'hidden'}>
        <CardsGrid category="modes" genderFilter={gender} locale={locale} onCardSelect={handleCardSelect} isMobile={isMobile} />
      </div>
      <div className={expandedSection === 'needs' ? '' : 'hidden'}>
        <CardsGrid category="needs" genderFilter={gender} locale={locale} onCardSelect={handleCardSelect} isMobile={isMobile} />
      </div>
      <div className={expandedSection === 'strengths' ? '' : 'hidden'}>
        <CardsGrid category="strengths" genderFilter={gender} locale={locale} onCardSelect={handleCardSelect} isMobile={isMobile} />
      </div>
      <div className={expandedSection === 'boat' ? '' : 'hidden'}>
        <CardsGrid category="boat" locale={locale} onCardSelect={handleCardSelect} isMobile={isMobile} />
      </div>
    </>
  );

  return (
    <div className={`absolute left-2 top-2 z-10 md:left-8 md:top-8 ${!isOpen ? 'hidden' : ''}`}>
      <div className="relative">
        {/* Main Panel */}
        <div className="bg-white border border-stroke rounded-2xl w-full max-w-sm p-4 md:max-w-none md:w-64 md:p-6">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <span className="text-sm font-medium text-foreground md:text-base">{t('title')}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 hover:bg-transparent md:size-8"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[60vh] md:gap-4 md:max-h-[70vh]">
          {/* Modes Section */}
          <div>
            <button
              onClick={() => toggleSection('modes')}
              className="flex w-full items-center justify-between rounded-lg border border-stroke px-2 py-1.5 transition-colors hover:bg-gray-100 md:px-3 md:py-2"
            >
              <div className="flex items-center gap-2">
                <Smile className="h-4 w-4 text-amber-500 md:h-5 md:w-5" />
                <span className="text-xs font-medium md:text-sm">{t('modes')}</span>
              </div>
              {expandedSection === 'modes' ? (
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
          </div>

          {/* Needs Section */}
          <div>
            <button
              onClick={() => toggleSection('needs')}
              className="flex w-full items-center justify-between rounded-lg border border-stroke px-2 py-1.5 transition-colors hover:bg-gray-100 md:px-3 md:py-2"
            >
              <div className="flex items-center gap-2">
                <div className="text-xs text-red-500 md:text-sm">❤️</div>
                <span className="text-xs font-medium md:text-sm">{t('needs')}</span>
              </div>
              {expandedSection === 'needs' ? (
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
          </div>

          {/* Strengths Section */}
          <div>
            <button
              onClick={() => toggleSection('strengths')}
              className="flex w-full items-center justify-between rounded-lg border border-stroke px-2 py-1.5 transition-colors hover:bg-gray-100 md:px-3 md:py-2"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                <span className="text-xs font-medium md:text-sm">{t('strengths')}</span>
              </div>
              {expandedSection === 'strengths' ? (
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
          </div>

          {/* Boat & Wave Section */}
          <div>
            <button
              onClick={() => toggleSection('boat')}
              className="flex w-full items-center justify-between rounded-lg border border-stroke px-2 py-1.5 transition-colors hover:bg-gray-100 md:px-3 md:py-2"
            >
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                <span className="text-xs font-medium md:text-sm">{t('boatAndWave')}</span>
              </div>
              {expandedSection === 'boat' ? (
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
          </div>

          {/* Frequently Used Section */}
          <div>
            <button
              onClick={() => toggleSection('frequent')}
              className="flex w-full items-center justify-between rounded-lg border border-stroke px-2 py-1.5 transition-colors hover:bg-gray-100 md:px-3 md:py-2"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                <span className="text-xs font-medium md:text-sm">{t('frequentlyUsed')}</span>
              </div>
              {expandedSection === 'frequent' ? (
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
            {expandedSection === 'frequent' && (
              <FrequentlyUsedCards onCardSelect={handleCardSelect} isExpanded={expandedSection === 'frequent'} isMobile={isMobile} />
            )}
          </div>

          {/* Saved Cards Section */}
          <div>
            <button
              onClick={() => toggleSection('saved')}
              className="flex w-full items-center justify-between rounded-lg border border-stroke px-2 py-1.5 transition-colors hover:bg-gray-100 md:px-3 md:py-2"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                <span className="text-xs font-medium md:text-sm">{t('savedCards')}</span>
              </div>
              {expandedSection === 'saved' ? (
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
            {expandedSection === 'saved' && (
              <SavedCards onCardSelect={handleCardSelect} isExpanded={expandedSection === 'saved'} isMobile={isMobile} />
            )}
          </div>
        </div>
      </div>

      {/* Render all card grids (always mounted, hidden when not expanded) */}
      {cardGrids}
    </div>
  </div>
  );
}

