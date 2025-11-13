'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthProfile } from '@/stores/authStore';
import { useRouter } from '@/i18n/navigation';
import {
  Menu,
  UserRound,
  Save,
  Calendar,
//  Camera,
//  Undo2,
//  Redo2,
//  User,
//  CalendarCheck,
  LogOut,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
//  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Gender } from '@/types/canvas';
import { SessionDetailsPanel } from './SessionDetailsPanel';
import type { Profile } from '@/types/auth';

//interface WindowWithCanvasCard extends Window {
//  _undoCanvas?: () => void;
//  _redoCanvas?: () => void;
//}

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
}: CanvasHeaderProps) {
  const t = useTranslations('canvas.header');
  const profile = useAuthProfile();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  const displayTitle = sessionTitle || t('defaultTitle');
  const displaySubtitle = sessionSubtitle || t('defaultSubtitle');
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

  const handleGoToDashboard = () => {
    if (profile?.role === 'patient') {
      router.push('/dashboard-patient');
    } else {
      router.push('/dashboard');
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    try {
      await onSave();
      toast.success('Canvas saved successfully');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error saving canvas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save canvas';
      toast.error(errorMessage);
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
//
//  const handleTakeScreenshot = () => {
//    // Placeholder
//    toast.info('Screenshot feature coming soon');
//    setIsMenuOpen(false);
//  };
//
//  const handleScheduleFollowUp = () => {
//    // Placeholder
//    toast.info('Schedule follow-up feature coming soon');
//    setIsMenuOpen(false);
//  };

  const toggleSessionPanel = () => {
    setIsSessionPanelOpen(!isSessionPanelOpen);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 w-full">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Section - Menu & Title */}
          <div className="flex items-center gap-4">
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-10"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="border-stroke shadow-none w-56"
              >
                <DropdownMenuItem onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={handleTakeScreenshot}>
                  <Camera className="w-4 h-4 mr-2" />
                  Take Screenshot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUndo}>
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
                  Leave Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


          
          <div className="flex flex-col">
            <span className="text-sm text-zinc-500">{sessionTitle || displayTitle}</span>
            <span className="text-base font-medium text-foreground">
              {sessionSubtitle || displaySubtitle}
            </span>
          </div>
        </div>

        {/* Right Section - Actions & Avatar */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="default" className="h-10">
                <UserRound className="w-5 h-5" />
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
          
          <Button 
            variant="secondary" 
            size="default" 
            className="h-10"
            onClick={handleSave}
            disabled={!onSave}
          >
            <Save className="w-5 h-5" />
            {t('save')}
          </Button>
          
          <Button 
            variant="secondary" 
            size="default" 
            className="h-10"
            onClick={toggleSessionPanel}
          >
            <Calendar className="w-5 h-5" />
            {t('session')}
          </Button>

          <Avatar className="size-10 rounded-lg shrink-0">
            <AvatarImage src={avatarUrl || undefined} alt="User avatar" className="rounded-lg" />
            <AvatarFallback className="rounded-lg bg-orange-400 text-white font-semibold text-sm">
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
              {isTherapist ? 'Patient Details' : 'Therapist Details'}
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
              <p><strong>Name:</strong> {patientProfile.full_name || patientProfile.first_name}</p>
              <p><strong>Email:</strong> {patientProfile.email}</p>
              {patientProfile.phone && <p><strong>Phone:</strong> {patientProfile.phone}</p>}
            </div>
          )}
          {isPatient && therapistProfile && (
            <div className="space-y-2">
              <p><strong>Name:</strong> {therapistProfile.full_name || therapistProfile.first_name}</p>
              <p><strong>Email:</strong> {therapistProfile.email}</p>
              {therapistProfile.phone && <p><strong>Phone:</strong> {therapistProfile.phone}</p>}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

