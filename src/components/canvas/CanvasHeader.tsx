'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthProfile } from '@/stores/authStore';
import { useRouter, usePathname } from '@/i18n/navigation';
import {
  Menu,
  UserRound,
  Save,
  Calendar,
  Bookmark,
//  Undo2,
//  Redo2,
//  User,
//  CalendarCheck,
  LogOut,
  X,
  Pencil,
  Check,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
//  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { Gender } from '@/types/canvas';
import { SessionDetailsPanel } from './SessionDetailsPanel';
import { buildSerializableCanvasState } from '@/lib/canvasPersistence';
import type { Profile } from '@/types/auth';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface WindowWithCanvasCard extends Window {
  _takeCanvasScreenshot?: () => Promise<Blob | null>;
}

interface CanvasHeaderProps {
  sessionTitle?: string;
  sessionSubtitle?: string;
  gender?: Gender;
  onGenderChange?: (gender: Gender) => void;
  onSave?: () => Promise<void>;
  sessionId?: string | null;
  patientProfile?: Profile | null;
  therapistProfile?: Profile | null;
  sessionType?: string;
  language?: string;
//  initialNotes?: string;
//  onNotesChange?: (notes: string) => void;
  currentDuration?: number; // Current session duration in seconds
  onSessionRenamed?: (newTitle: string) => void;
  onBackgroundClick?: () => void;
  isDemoSession?: boolean; // Flag to indicate if this is a demo session
}

export function CanvasHeader({
  sessionTitle,
  sessionSubtitle,
  gender = 'male',
  onGenderChange,
  onSave,
  sessionId,
  patientProfile,
  therapistProfile,
  sessionType = 'Individual',
  language = 'English',
//  initialNotes = '',
//  onNotesChange,
  currentDuration = 0,
  onSessionRenamed,
  onBackgroundClick,
  isDemoSession = false,
}: CanvasHeaderProps) {
  const t = useTranslations('canvas.header');
  const locale = useLocale();
  const pathname = usePathname();
  const profile = useAuthProfile();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sessionTitle || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSavingCheckpoint, setIsSavingCheckpoint] = useState(false);
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');

  const now = new Date();
  const displayTitle = sessionTitle || t('defaultTitle');
  const displaySubtitle = sessionSubtitle || t('defaultSubtitle', { 
    date: now.getDate(),
    month: now.toLocaleString(locale, { month: 'long' })
  });
  const isTherapist = profile?.role === 'therapist';
  const isPatient = profile?.role === 'patient';

  // Fetch signed avatar URL
  useEffect(() => {
    const fetchAvatarUrl = async () => {
      if (profile?.avatar_url) {
        try {
          const response = await fetch('/api/profile/avatar/url');
          if (response.ok) {
            const data = await response.json();
            if (data.signed_url) {
              setAvatarUrl(data.signed_url);
            }
          }
        } catch (error) {
          console.error('Error fetching avatar URL:', error);
        }
      } else {
        setAvatarUrl(null);
      }
    };

    fetchAvatarUrl();
  }, [profile?.avatar_url]);

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleLanguageChange = (newLocale: string) => {
    // Navigate to the same path but with the new locale
    router.replace(pathname, { locale: newLocale });
  };

  const handleGoToDashboard = () => {
    // For demo sessions, redirect to demonstration page
    if (isDemoSession || sessionId?.startsWith('demo-')) {
      router.push('/demonstration');
      return;
    }
    
    if (profile?.role === 'patient') {
      router.push('/dashboard-patient');
    } else {
      router.push('/dashboard');
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    changeMouseCursorTo('wait');
    try {
      await onSave();
      toast.success(t('saveSuccess'));
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error saving canvas:', error);
      const errorMessage = error instanceof Error ? error.message : t('saveError');
      toast.error(errorMessage);
    } finally {
      changeMouseCursorTo('default');
    }
  };

  const changeMouseCursorTo = (cursor: string) => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.cursor = cursor;
    }
  };

//  const handleUndo = () => {
//    const win = window as WindowWithCanvasCard;
//    if (win._undoCanvas) {
//      win._undoCanvas();
//    }
//    setIsMenuOpen(false);
//  };
//
//  const handleRedo = () => {
//    const win = window as WindowWithCanvasCard;
//    if (win._redoCanvas) {
//      win._redoCanvas();
//    }
//    setIsMenuOpen(false);
//  };

  const handleLeaveSession = () => {
    handleGoToDashboard();
    setIsMenuOpen(false);
  };

//  const handleShowDetails = () => {
//    setShowDetailsDialog(true);
//    setIsMenuOpen(false);
//  };

  const handleOpenCheckpointDialog = () => {
    // Disable checkpoint saving for demo sessions
    if (isDemoSession || sessionId?.startsWith('demo-')) {
      toast.info('Checkpoint saving is not available in demo mode');
      setIsMenuOpen(false);
      return;
    }
    
    if (!sessionId) {
      toast.error(t('checkpointNoSession') || 'Cannot save checkpoint without a session');
      return;
    }
    setCheckpointName('');
    setShowCheckpointDialog(true);
    setIsMenuOpen(false);
  };

  const handleSaveCheckpoint = async () => {
    if (!sessionId || !checkpointName.trim()) {
      return;
    }

    setIsSavingCheckpoint(true);
    setShowCheckpointDialog(false);

    try {
      const win = window as WindowWithCanvasCard;
      
      // Get current canvas state
      const canvasState = buildSerializableCanvasState();
      
      // Capture screenshot
      let screenshotBlob: Blob | null = null;
      if (win._takeCanvasScreenshot) {
        screenshotBlob = await win._takeCanvasScreenshot();
      }

      // Create a local data URL from the blob for the toast preview
      let localImageUrl: string | null = null;
      if (screenshotBlob) {
        localImageUrl = URL.createObjectURL(screenshotBlob);
      }

      // Upload to API
      const formData = new FormData();
      formData.append('name', checkpointName.trim());
      formData.append('state', JSON.stringify(canvasState));
      if (screenshotBlob) {
        formData.append('screenshot', screenshotBlob, 'screenshot.png');
      }

      const response = await fetch(`/api/sessions/${sessionId}/checkpoints`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (localImageUrl) URL.revokeObjectURL(localImageUrl);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save checkpoint');
      }

      // Show success toast with image preview using local blob URL
      toast.success(
        <div className="flex flex-col gap-2">
          <span>{t('checkpointSaved') || 'Checkpoint saved!'}</span>
          {localImageUrl && (
            <img 
              src={localImageUrl} 
              alt="Checkpoint" 
              className="rounded-md max-w-[200px] max-h-[150px] object-contain border border-gray-200"
            />
          )}
        </div>,
        { 
          duration: 5000,
          onDismiss: () => localImageUrl && URL.revokeObjectURL(localImageUrl),
          onAutoClose: () => localImageUrl && URL.revokeObjectURL(localImageUrl),
        }
      );

      // Dispatch event to notify checkpoints list to refresh
      window.dispatchEvent(new Event('checkpointCreated'));
    } catch (error) {
      console.error('Error saving checkpoint:', error);
      const errorMessage = error instanceof Error ? error.message : t('checkpointError') || 'Failed to save checkpoint';
      toast.error(errorMessage);
    } finally {
      setIsSavingCheckpoint(false);
      setCheckpointName('');
    }
  };

//  const handleScheduleFollowUp = () => {
//    // Placeholder
//    toast.info('Schedule follow-up feature coming soon');
//    setIsMenuOpen(false);
//  };

  const toggleSessionPanel = () => {
    setIsSessionPanelOpen(!isSessionPanelOpen);
  };

  const handleStartEditing = () => {
    setEditedTitle(sessionTitle || displayTitle);
    setIsEditingTitle(true);
  };

  const handleCancelEditing = () => {
    setEditedTitle(sessionTitle || displayTitle);
    setIsEditingTitle(false);
  };

  const handleRenameSession = async () => {
    const trimmedTitle = editedTitle.trim();
    
    // Validation
    if (trimmedTitle.length < 1) {
      toast.error(t('nameTooShort'));
      return;
    }
    if (trimmedTitle.length > 60) {
      toast.error(t('nameTooLong'));
      return;
    }
    
    if (!sessionId) {
      toast.error(t('renameError'));
      return;
    }

    // For demo sessions, just update locally (no API call)
    if (isDemoSession || sessionId.startsWith('demo-')) {
      if (onSessionRenamed) {
        onSessionRenamed(trimmedTitle);
      }
      setIsEditingTitle(false);
      toast.success(t('sessionRenamed'));
      return;
    }

    setIsRenaming(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename session');
      }

      toast.success(t('sessionRenamed'));
      setIsEditingTitle(false);
      onSessionRenamed?.(trimmedTitle);
    } catch (error) {
      console.error('Error renaming session:', error);
      toast.error(t('renameError'));
    } finally {
      setIsRenaming(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSession();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  const handleHeaderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click was on an interactive element (button, input, etc.)
    const target = e.target as HTMLElement;
    const interactiveElements = ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA'];
    
    // Check if target or any parent up to the header is interactive
    let element: HTMLElement | null = target;
    while (element && element !== e.currentTarget) {
      if (
        interactiveElements.includes(element.tagName) ||
        element.getAttribute('role') === 'button' ||
        element.getAttribute('role') === 'menuitem' ||
        element.hasAttribute('data-radix-collection-item')
      ) {
        // Clicked on an interactive element, don't trigger background click
        return;
      }
      element = element.parentElement;
    }
    
    // Only trigger if clicking on the header background
    onBackgroundClick?.();
  };

  // Use mounted state to avoid hydration mismatch
  const shouldUseMobileStyles = mounted && isMobile;

  return (
    <>
      <div className="bg-white border-b border-gray-200 w-full" onClick={handleHeaderClick}>
        <div className={cn(
          "flex items-center justify-between",
          shouldUseMobileStyles ? "px-2 py-1.5" : "px-2 py-1 md:px-6 md:py-4"
        )}>
          {/* Left Section - Menu & Title */}
          <div className={cn(
            "flex items-center",
            shouldUseMobileStyles ? "gap-2" : "gap-4"
          )}>
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    shouldUseMobileStyles ? "size-7" : "size-8 md:size-10"
                  )}
                >
                  <Menu className={cn(
                    shouldUseMobileStyles ? "w-3.5 h-3.5" : "w-4 h-4 md:w-6 md:h-6"
                  )} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="border-stroke shadow-none w-56"
              >
                <DropdownMenuItem onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  {t('save')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleOpenCheckpointDialog} 
                  disabled={isSavingCheckpoint || !sessionId || isDemoSession || sessionId?.startsWith('demo-')}
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  {isSavingCheckpoint ? (t('checkpointLoading') || 'Saving...') : (t('saveCheckpoint') || 'Save Checkpoint')}
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={handleUndo}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRedo}>
                  <Redo2 className="w-4 h-4 mr-2" />
                  Redo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleShowDetails}>
                  <User className="w-4 h-4 mr-2" />
                  {isTherapist ? 'Patient Details' : 'Therapist Details'}
                </DropdownMenuItem> 
                {isTherapist && (
                  <DropdownMenuItem onClick={handleScheduleFollowUp}>
                    <CalendarCheck className="w-4 h-4 mr-2" />
                    Schedule Follow Up
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />*/}
                <DropdownMenuItem onClick={handleLeaveSession}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('leaveSession')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


          
          <div className="flex flex-col min-w-0 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className={cn(
                    "font-medium",
                    shouldUseMobileStyles ? "h-6 text-xs w-32" : "h-7 md:h-8 text-sm md:text-lg w-40 md:w-60"
                  )}
                  maxLength={60}
                  autoFocus
                  disabled={isRenaming}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-green-600 hover:text-green-700 hover:bg-green-50",
                    shouldUseMobileStyles ? "size-5" : "size-6 md:size-7"
                  )}
                  onClick={handleRenameSession}
                  disabled={isRenaming}
                >
                  <Check className={cn(shouldUseMobileStyles ? "w-3 h-3" : "w-4 h-4")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-gray-500 hover:text-gray-700",
                    shouldUseMobileStyles ? "size-5" : "size-6 md:size-7"
                  )}
                  onClick={handleCancelEditing}
                  disabled={isRenaming}
                >
                  <X className={cn(shouldUseMobileStyles ? "w-3 h-3" : "w-4 h-4")} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className={cn(
                  "font-medium text-foreground truncate",
                  shouldUseMobileStyles ? "text-xs" : "text-sm md:text-lg"
                )}>{sessionTitle || displayTitle}</span>
                {(isTherapist || isDemoSession || sessionId?.startsWith('demo-')) && sessionId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-gray-400 hover:text-gray-600 shrink-0",
                      shouldUseMobileStyles ? "size-4" : "size-5 md:size-6"
                    )}
                    onClick={handleStartEditing}
                    title={t('renameSession')}
                  >
                    <Pencil className={cn(shouldUseMobileStyles ? "w-2.5 h-2.5" : "w-3 h-3 md:w-3.5 md:h-3.5")} />
                  </Button>
                )}
              </div>
            )}
            <span className={cn(
              "text-zinc-500 truncate",
              shouldUseMobileStyles ? "text-[10px]" : "text-xs md:text-sm"
            )}>
              {sessionSubtitle || displaySubtitle}
            </span>
          </div>
        </div>

        {/* Right Section - Actions & Avatar */}
        <div className={cn(
          "flex items-center shrink-0",
          shouldUseMobileStyles ? "gap-1" : "gap-2 md:gap-4"
        )}>
          {/* Language Switcher - Only show for demo sessions */}
          {isDemoSession && (
            <LanguageSwitcher variant="secondary" size={shouldUseMobileStyles ? "sm" : "default"} />
          )}
          
          {isDemoSession !== true && !shouldUseMobileStyles && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="default" className="h-8 md:h-10">
                  <Globe className="w-4 h-4 md:w-6 md:h-6" />
                  {locale === 'en' ? 'English' : 'Português'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-stroke" align="end">
                <DropdownMenuItem
                  onClick={() => handleLanguageChange('en')}
                  className={locale === 'en' ? 'bg-gray-100' : ''}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleLanguageChange('pt')}
                  className={locale === 'pt' ? 'bg-gray-100' : ''}
                >
                  Português
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="default" className="h-8 md:h-10">
                  <UserRound className="w-4 h-4 md:w-6 md:h-6" />
                  {t('gender')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-stroke" align="end">
                <DropdownMenuItem
                  onClick={() => onGenderChange?.('male')}
                  className={gender === 'male' ? 'bg-gray-100' : ''}
                >
                  {t('male')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onGenderChange?.('female')}
                  className={gender === 'female' ? 'bg-gray-100' : ''}
                >
                  {t('female')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {!isMobile && (
            <Button 
              variant="secondary" 
              size="default" 
              className="h-8 md:h-10"
              onClick={handleSave}
              disabled={!onSave}
            >
              <Save className="w-4 h-4 md:w-6 md:h-6" />
              {t('save')}
            </Button>
          )}
          
          <Button 
            variant="secondary" 
            size={shouldUseMobileStyles ? "icon" : "default"}
            className={cn(
              shouldUseMobileStyles ? "size-7" : "h-8 md:h-10"
            )}
            onClick={toggleSessionPanel}
          >
            <Calendar className={cn(shouldUseMobileStyles ? "w-3.5 h-3.5" : "w-4 h-4 md:w-6 md:h-6")} />
            {!shouldUseMobileStyles && t('session')}
          </Button>

          <Avatar className={cn(
            "rounded-lg shrink-0",
            shouldUseMobileStyles ? "size-7" : "size-10"
          )}>
            <AvatarImage src={avatarUrl || undefined} alt={t('userAvatar')} className="rounded-lg" />
            <AvatarFallback className={cn(
              "rounded-lg bg-orange-400 text-white font-semibold",
              shouldUseMobileStyles ? "text-[10px]" : "text-sm"
            )}>
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>

    {/* Session Details Panel */}
    {isSessionPanelOpen && (
      <SessionDetailsPanel
        isOpen={isSessionPanelOpen}
        onClose={() => setIsSessionPanelOpen(false)}
        sessionId={sessionId || null}
        userRole={isTherapist ? 'therapist' : isPatient ? 'patient' : undefined}
        patientProfile={patientProfile}
        therapistProfile={therapistProfile}
        sessionType={sessionType}
        language={language}
//        initialNotes={initialNotes}
//        onNotesChange={onNotesChange}
        currentDuration={currentDuration}
      />
    )}

    {/* Details Dialog - Placeholder for now */}
    {showDetailsDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white border border-stroke rounded-2xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {isTherapist ? t('patientDetails') : t('therapistDetails')}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setShowDetailsDialog(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {isTherapist && patientProfile && (
            <div className="space-y-2">
              <p><strong>{t('name')}</strong> {patientProfile.full_name || patientProfile.first_name}</p>
              <p><strong>{t('email')}</strong> {patientProfile.email}</p>
              {patientProfile.phone && <p><strong>{t('phone')}</strong> {patientProfile.phone}</p>}
            </div>
          )}
          {isPatient && therapistProfile && (
            <div className="space-y-2">
              <p><strong>{t('name')}</strong> {therapistProfile.full_name || therapistProfile.first_name}</p>
              <p><strong>{t('email')}</strong> {therapistProfile.email}</p>
              {therapistProfile.phone && <p><strong>{t('phone')}</strong> {therapistProfile.phone}</p>}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Checkpoint Name Dialog */}
    <AlertDialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('saveCheckpoint') || 'Save Checkpoint'}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('checkpointNameDescription') || 'Enter a name for this checkpoint to help you identify it later.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            value={checkpointName}
            onChange={(e) => setCheckpointName(e.target.value)}
            placeholder={t('checkpointNamePlaceholder') || 'Checkpoint name...'}
            maxLength={100}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && checkpointName.trim()) {
                e.preventDefault();
                handleSaveCheckpoint();
              }
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSaveCheckpoint}
            disabled={!checkpointName.trim() || isSavingCheckpoint}
          >
            {isSavingCheckpoint ? (t('checkpointLoading') || 'Saving...') : (t('save') || 'Save')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

