'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LayoutDashboard, Users, Activity, Settings, X, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthProfile } from '@/stores/authStore';
import { useRouter } from '@/i18n/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations('dashboard.sidebar');
  const pathname = usePathname();
  const profile = useAuthProfile();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const navItems = [
    {
      label: t('dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: t('patients'),
      href: '/dashboard/patients',
      icon: Users,
    },
// {
//   label: t('activity'),
//   href: '/dashboard/activity',
//   icon: Activity,
// },
    {
      label: t('settings'),
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    // Exact match for dashboard home
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/en/dashboard' || pathname === '/pt/dashboard';
    }
    // Check if current path starts with the href
    return pathname.includes(href);
  };

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
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.full_name) {
      return profile.full_name;
    }
    return profile?.email || 'User';
  };

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

  const handleProfileClick = () => {
    if (profile?.role === 'patient') {
      router.push('/dashboard-patient/settings');
    } else {
      router.push('/dashboard/settings');
    }
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-[300px] 
          bg-background border-r border-input
          transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 lg:hidden text-foreground hover:text-accent"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="px-6 pt-8 pb-4">
          <div className="w-[160px] h-[37px] relative">
            <Image
              src="/imodes.png"
              alt="iModes"
              width={160}
              height={37}
              className="object-contain"
            />
          </div>
        </div>

        {/* Profile Card */}
        {profile && (
          <button
            onClick={handleProfileClick}
            className="mx-6 mb-6 flex items-center gap-3 rounded-2xl border border-input bg-muted/40 px-4 py-3 text-left transition hover:border-primary"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={avatarUrl || undefined} alt={profile.first_name || profile.email || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold text-foreground">{getDisplayName()}</span>
              {profile?.email && (
                <span className="text-xs text-muted-foreground truncate" title={profile.email}>
                  {profile.email.length > 15 ? `${profile.email.substring(0, 15)}...` : profile.email}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-6">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-2 px-3 py-1 rounded-md
                    text-sm font-normal transition-colors
                    ${
                      active
                        ? 'bg-sky-50 text-sky-600'
                        : 'text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}


