'use client';

import { useState, useCallback } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CanvasBoard } from '@/components/canvas/CanvasBoard';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { ToolsPanel } from '@/components/canvas/ToolsPanel';
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
import { Gender, CardCategory } from '@/types/canvas';
import {
  MousePointer2,
  Type,
  Undo2,
  Redo2,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

interface WindowWithCanvasCard extends Window {
  _addCanvasCard?: (card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  _clearCanvas?: () => void;
}

export default function CanvasPage() {
  usePageMetadata('Canvas', 'Interactive canvas for therapy sessions.');
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const tControls = useTranslations('canvas.controls');
  const tPage = useTranslations('canvas.page');
  
  const [toolMode, setToolMode] = useState<'select' | 'hand' | 'text'>('select');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(true);
  const [gender, setGender] = useState<Gender>('male');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleAddCard = useCallback((card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => {
    // Trigger card addition via global method
    const win = window as WindowWithCanvasCard;
    if (win._addCanvasCard) {
      win._addCanvasCard(card);
    }
  }, []);

  const handleClearCanvas = useCallback(() => {
    const win = window as WindowWithCanvasCard;
    if (win._clearCanvas) {
      win._clearCanvas();
    }
    setShowClearDialog(false);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50">
      {/* Header */}
      <CanvasHeader 
        gender={gender}
        onGenderChange={setGender}
      />

      {/* Canvas with Floating Controls */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas Background - Full Screen */}
        <CanvasBoard 
          onAddCard={handleAddCard} 
          scale={zoomLevel / 100}
          gender={gender}
          locale={locale}
          toolMode={toolMode}
        />

        {/* Left Panel - Tools */}
        <ToolsPanel 
          isOpen={isToolsPanelOpen} 
          onClose={() => setIsToolsPanelOpen(false)}
          gender={gender}
          locale={locale}
          onCardSelect={handleAddCard}
        />
        
        {!isToolsPanelOpen && (
          <div className="absolute left-6 top-6 z-10">
            <Button 
              variant="secondary" 
              className="h-auto px-4 py-2 gap-14"
              onClick={() => setIsToolsPanelOpen(true)}
            >
              <span className="text-base font-medium">{tPage('tools')}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path
                  d="M6 5L9.5 8.5L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        )}

        {/* Right Panel - Vertical Tool Icons */}
        <div className="absolute right-6 top-6 z-10">
          <div className="flex flex-col gap-4">
            <Button
              variant={toolMode === 'select' ? 'default' : 'secondary'}
              size="icon"
              className="size-10"
              onClick={() => setToolMode('select')}
              title={tControls('cursorTool')}
            >
              <MousePointer2 className="w-5 h-5" />
            </Button>

            <Button
              variant={toolMode === 'text' ? 'default' : 'secondary'}
              size="icon"
              className="size-10"
              onClick={() => setToolMode('text')}
              title={tControls('textTool')}
            >
              <Type className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Bottom Right - Controls */}
        <div className="absolute right-6 bottom-6 z-10 flex items-center gap-6">
          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              title={tControls('undo')}
            >
              <Undo2 className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              title={tControls('redo')}
            >
              <Redo2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              onClick={() => setZoomLevel(Math.min(400, zoomLevel + 10))}
              title={tControls('zoomIn')}
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="default"
              className="h-10 w-[85px]"
              onClick={() => setZoomLevel(100)}
            >
              {zoomLevel}%
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
              title={tControls('zoomOut')}
            >
              <Minus className="w-5 h-5" />
            </Button>
          </div>

          {/* Clear Canvas Button */}
          <Button
            variant="secondary"
            size="icon"
            className="size-10"
            onClick={() => setShowClearDialog(true)}
            title={tControls('clearCanvas') || 'Clear Canvas'}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Clear Canvas Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tControls('clearCanvasTitle') || 'Clear Canvas'}</AlertDialogTitle>
            <AlertDialogDescription>
              {tControls('clearCanvasMessage') || 'Are you sure you want to clear the entire canvas? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tControls('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCanvas}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tControls('clear') || 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

