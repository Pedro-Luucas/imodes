'use client';

import { useState } from 'react';
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
              onClick={() => onCardSelect?.({
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
                  unoptimized
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
            <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
              <div className="text-sm text-gray-500 text-center py-8">{t('noFrequentlyUsed')}</div>
            </div>
          )}
        </div>

        {/* Saved Work Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('saved')}
            className="flex items-center border border-stroke justify-between w-full py-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{t('savedWork')}</span>
            </div>
            {expandedSection === 'saved' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSection === 'saved' && (
            <div className="absolute left-72 top-0 bg-white border border-stroke rounded-2xl p-4 max-h-[600px] overflow-y-auto w-[480px] shadow-lg">
              <div className="text-sm text-gray-500 text-center py-8">{t('noSavedWork')}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Render all card grids (always mounted, hidden when not expanded) */}
      {cardGrids}
    </div>
  );
}

