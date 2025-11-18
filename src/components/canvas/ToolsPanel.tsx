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
import { CardCategory, Gender } from '@/types/canvas';
import { trackCardUsage, getFrequentlyUsedCards, type CardUsage } from '@/lib/cardUsageTracker';
import { getSavedCards, removeSavedCard, type SavedCard } from '@/lib/savedCardsTracker';

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
  onCardSelect 
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
    <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8 text-sm text-red-500">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
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
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  style={{
                    imageRendering: 'auto',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs text-center p-2">
                  {card.name}
                </div>
              )}
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
  isExpanded
}: { 
  onCardSelect?: (card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  isExpanded?: boolean;
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
      <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
        <div className="text-sm text-gray-500 text-center py-8">{t('noFrequentlyUsed')}</div>
      </div>
    );
  }

  return (
    <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
      <div className="grid grid-cols-3 gap-3">
        {frequentCards.map((cardUsage) => (
          <div
            key={`${cardUsage.category}-${cardUsage.cardNumber}`}
            className="aspect-square rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-gray-100"
            onClick={() => handleCardClick(cardUsage)}
          >
            {cardUsage.imageUrl ? (
              <Image
                src={cardUsage.imageUrl}
                alt={cardUsage.title}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                style={{
                  imageRendering: 'auto',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs text-center p-2">
                {cardUsage.title}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Component to display saved cards
function SavedCards({ 
  onCardSelect,
  isExpanded
}: { 
  onCardSelect?: (card: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  isExpanded?: boolean;
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
      <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
        <div className="text-sm text-gray-500 text-center py-8">{t('noSavedCards')}</div>
      </div>
    );
  }

  return (
    <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
      <div className="grid grid-cols-3 gap-3">
        {savedCards.map((savedCard) => (
          <div
            key={`${savedCard.category}-${savedCard.cardNumber}`}
            className="aspect-square rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-gray-100 relative group"
            onClick={() => handleCardClick(savedCard)}
          >
            {savedCard.imageUrl ? (
              <Image
                src={savedCard.imageUrl}
                alt={savedCard.title}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                style={{
                  imageRendering: 'auto',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs text-center p-2">
                {savedCard.title}
              </div>
            )}
            {/* Remove button on hover */}
            <button
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
  const [expandedSection, setExpandedSection] = useState<string | null>('modes');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Always render all card grids to ensure hooks are called consistently
  // Hide them with CSS when not expanded - this ensures hooks run every render
  const cardGrids = (
    <>
      <div className={expandedSection === 'modes' ? '' : 'hidden'}>
        <CardsGrid category="modes" genderFilter={gender} locale={locale} onCardSelect={onCardSelect} />
      </div>
      <div className={expandedSection === 'needs' ? '' : 'hidden'}>
        <CardsGrid category="needs" genderFilter={gender} locale={locale} onCardSelect={onCardSelect} />
      </div>
      <div className={expandedSection === 'strengths' ? '' : 'hidden'}>
        <CardsGrid category="strengths" genderFilter={gender} locale={locale} onCardSelect={onCardSelect} />
      </div>
      <div className={expandedSection === 'boat' ? '' : 'hidden'}>
        <CardsGrid category="boat" locale={locale} onCardSelect={onCardSelect} />
      </div>
    </>
  );

  return (
    <div className={`flex gap-4 absolute left-8 top-8 z-10 ${!isOpen ? 'hidden' : ''}`}>
      {/* Main Panel */}
      <div className="bg-white border border-stroke rounded-2xl p-6 w-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-medium text-foreground">{t('title')}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 hover:bg-transparent"
            onClick={onClose}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Modes Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('modes')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">{t('modes')}</span>
            </div>
            {expandedSection === 'modes' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Needs Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('needs')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="text-red-500">❤️</div>
              <span className="text-sm font-medium">{t('needs')}</span>
            </div>
            {expandedSection === 'needs' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Strengths Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('strengths')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{t('strengths')}</span>
            </div>
            {expandedSection === 'strengths' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Boat & Wave Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('boat')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{t('boatAndWave')}</span>
            </div>
            {expandedSection === 'boat' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Frequently Used Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('frequent')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{t('frequentlyUsed')}</span>
            </div>
            {expandedSection === 'frequent' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSection === 'frequent' && (
            <FrequentlyUsedCards onCardSelect={onCardSelect} isExpanded={expandedSection === 'frequent'} />
          )}
        </div>

        {/* Saved Cards Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('saved')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{t('savedCards')}</span>
            </div>
            {expandedSection === 'saved' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSection === 'saved' && (
            <SavedCards onCardSelect={onCardSelect} isExpanded={expandedSection === 'saved'} />
          )}
        </div>
      </div>
      
      {/* Render all card grids (always mounted, hidden when not expanded) */}
      {cardGrids}
    </div>
  );
}

