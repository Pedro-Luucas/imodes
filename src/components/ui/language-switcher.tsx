'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'pt', name: 'Português', flag: '🇧🇷 ' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
] as const;

interface LanguageSwitcherProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'outline', 
  size = 'default',
  className 
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    // Preserve query parameters when changing locale
    const queryString = searchParams.toString();
    const pathWithQuery = queryString ? `${pathname}?${queryString}` : pathname;
    
    router.replace(pathWithQuery, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
        >
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-lg">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {locale === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
