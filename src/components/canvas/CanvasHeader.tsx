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
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Gender } from '@/types/canvas';

interface CanvasHeaderProps {
  sessionTitle?: string;
  sessionSubtitle?: string;
  gender?: Gender;
  onGenderChange?: (gender: Gender) => void;
  onSave?: () => Promise<void>;
}

export function CanvasHeader({
  sessionTitle,
  sessionSubtitle,
  gender = 'male',
  onGenderChange,
  onSave,
}: CanvasHeaderProps) {
  const t = useTranslations('canvas.header');
  const profile = useAuthProfile();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const displayTitle = sessionTitle || t('defaultTitle');
  const displaySubtitle = sessionSubtitle || t('defaultSubtitle');

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
    } catch (error) {
      console.error('Error saving canvas:', error);
      toast.error('Failed to save canvas');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 w-full">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section - Menu & Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="size-10"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            onClick={handleGoToDashboard}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Button>
          
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
            <DropdownMenuContent align="end">
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
          
          <Button variant="secondary" size="default" className="h-10">
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
  );
}

