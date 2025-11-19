'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { AlertTriangle, AppWindow, Settings, Users, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useAuthProfile } from '@/stores/authStore';

export default function DashboardPage() {
  const locale = useLocale();
  const page = useTranslations('dashboard.page');
  const sidebar = useTranslations('dashboard.sidebar');
  
  usePageMetadata(page('pageTitle'), page('pageDescription'));

  const profile = useAuthProfile();

  const roleLabel = useMemo(() => {
    if (!profile?.role) return page('roleFallback');
    return profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  }, [profile?.role, page]);

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(profile.created_at));
  }, [profile?.created_at]);

  const quickLinks = useMemo(
    () => [
      {
        id: 'settings',
        label: sidebar('settings'),
        href: `/${locale}/dashboard/settings`,
        icon: Settings,
        variant: 'secondary' as const,
      },
      {
        id: 'patients',
        label: sidebar('patients'),
        href: `/${locale}/dashboard/patients`,
        icon: Users,
        variant: 'secondary' as const,
      },
      {
        id: 'canvas-selection',
        label: page('canvasSelection'),
        href: `/${locale}/canvas-selection`,
        icon: AppWindow,
        variant: 'secondary' as const,
      },
    ],
    [locale, sidebar, page]
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 lg:px-0">
      <header className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{page('title')}</p>
        <h1 className="text-3xl font-semibold text-foreground">{page('workspaceReady')}</h1>
        <p className="text-sm text-muted-foreground">
          {page('underConstructionMessage')}
        </p>
      </header>

      <Card className="border border-input px-6 py-5 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{page('signedInAs')}</p>
              <p className="text-2xl font-semibold text-foreground">
                {profile?.full_name || profile?.first_name || page('loadingUser')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">
                  {roleLabel}
                </Badge>
                {memberSince && (
                  <span className="text-sm text-muted-foreground">{page('memberSince', { date: memberSince })}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile?.email || page('noEmailAvailable')}</p>
            </div>
          </div>
          <Button asChild variant="secondary" className="self-start md:self-auto">
            <Link href={`/${locale}/dashboard/settings`}>{sidebar('settings')}</Link>
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{page('quickActions')}</h2>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.id}
                asChild
                variant={link.variant}
                className="px-5"
              >
                <Link href={link.href} className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </section>

      <Card className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-6 py-5">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-primary">{page('developmentTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {page('developmentDescription')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
