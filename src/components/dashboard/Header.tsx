'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, Settings, ChevronDown, Menu } from 'lucide-react';
import { useAuthProfile } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const profile = useAuthProfile();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

          {/* Search bar */}
          <div className="relative w-full max-w-[448px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 bg-popover border-input h-10"
            />
          </div>
        </div>

        {/* Right: Icons + User */}
        <div className="flex items-center gap-6">
          {/* Notification Button */}
          <Button
            variant="secondary"
            size="icon"
            className="rounded-lg"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {/* Settings Button */}
          <Button
            variant="secondary"
            size="icon"
            className="rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar className="w-10 h-10">
              <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden md:block">
              {getDisplayName()}
            </span>
            <ChevronDown className="w-6 h-6 text-foreground hidden md:block" />
          </div>
        </div>
      </div>
    </header>
  );
}


