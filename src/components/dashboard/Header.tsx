'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Menu,  LogOut } from 'lucide-react';
import { useAuthProfile, useAuthActions } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/ui/notification-center';
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
import { logout } from '@/lib/authClient';
import { useRouter } from '@/i18n/navigation';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const t = useTranslations('dashboard.header');
  const profile = useAuthProfile();
  const { logout: logoutAction } = useAuthActions();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return profile?.email || 'User';
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    setShowLogoutDialog(false);
    try {
      await logout();
      logoutAction();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleSettingsClick = () => {
    if (profile?.role === 'patient') {
      router.push('/dashboard-patient/settings');
    } else {
      router.push('/dashboard/settings');
    }
  };

  const handleGoToCanvasSelection = () => {
    router.push('/canvas-selection');
  };

  return (
    <header className="border-b border-input bg-background sticky top-0 z-30">
      <div className="flex items-center justify-between px-8 py-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden text-foreground hover:text-accent"
          >
            <Menu className="w-6 h-6" />
          </button>

        </div>

        {/* Right: Icons + User */}
        <div className="flex items-center gap-6">
          {/* Notification Button */}
          <NotificationCenter className="rounded-lg" />

          {/* Settings Button */}
          <Button
            variant="secondary"
            size="icon"
            className="rounded-lg"
            onClick={handleSettingsClick}
          >
            <Settings className="w-5 h-5" />
          </Button>

          {/* Canvas Selection Button */}
          <Button
            variant="outline"
            onClick={handleGoToCanvasSelection}
          >
            Canvas Selection (test)
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={avatarUrl || undefined} alt={t('profilePicture')} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden md:block">
              {getDisplayName()}
            </span>
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-destructive/10"
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
          >
            <LogOut className="w-5 h-5 text-destructive" />
          </Button>

        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-popover text-popover-foreground border-stroke">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmLogout')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmLogoutMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {t('logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}


