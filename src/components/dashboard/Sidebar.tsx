'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LayoutDashboard, Users, Activity, Settings, X } from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations('dashboard.sidebar');
  const pathname = usePathname();
  
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
        <div className="px-6 py-8">
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


