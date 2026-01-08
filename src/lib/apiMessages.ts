import { cookies } from 'next/headers';
import enMessages from '../../messages/en.json';
import ptMessages from '../../messages/pt.json';
import nlMessages from '../../messages/nl.json';
import itMessages from '../../messages/it.json';

// SUPPORTED_LOCALES is used as a type only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SUPPORTED_LOCALES = ['en', 'pt', 'nl', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const fallbackLocale: SupportedLocale = 'en';

type ApiMessages = (typeof enMessages)['api'];

const apiMessagesMap: Record<SupportedLocale, ApiMessages> = {
  en: enMessages.api,
  pt: ptMessages.api,
  nl: nlMessages.api,
  it: itMessages.api,
};

const getLocaleFromCookies = async (): Promise<string | undefined> => {
  try {
    const cookieStore = await cookies();
    const nextLocaleCookie = cookieStore.get('NEXT_LOCALE')?.value;
    if (nextLocaleCookie) {
      return nextLocaleCookie;
    }
  } catch {
    // cookies() is only available in server contexts; ignore failures elsewhere
    // starting
  }

  return undefined;
};

const resolveLocaleInput = async (locale?: string): Promise<string | undefined> =>
  locale ?? (await getLocaleFromCookies());

const normalizeLocale = (locale?: string): SupportedLocale => {
  if (!locale) {
    return fallbackLocale;
  }

  const normalized = locale.toLowerCase();

  if (normalized.startsWith('pt')) {
    return 'pt';
  }
  if (normalized.startsWith('nl')) {
    return 'nl';
  }
  if (normalized.startsWith('it')) {
    return 'it';
  }

  return 'en';
};

export const getApiMessages = async (locale?: string): Promise<ApiMessages> => {
  const resolvedLocale = await resolveLocaleInput(locale);
  const normalized = normalizeLocale(resolvedLocale);
  return apiMessagesMap[normalized] ?? apiMessagesMap[fallbackLocale];
};

export type ApiMessageBundle = Awaited<ReturnType<typeof getApiMessages>>;


