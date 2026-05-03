/**
 * i18n Configuration
 *
 * Translations are bundled inline (no HTTP fetch) to avoid
 * showing raw keys on first render / hard reload.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// EN
import enCommon from '../../public/locales/en/common.json';
import enAuth from '../../public/locales/en/auth.json';
import enVideos from '../../public/locales/en/videos.json';
import enProfile from '../../public/locales/en/profile.json';
import enNavigation from '../../public/locales/en/navigation.json';
import enErrors from '../../public/locales/en/errors.json';
import enNotifications from '../../public/locales/en/notifications.json';
import enWallet from '../../public/locales/en/wallet.json';

// ES
import esCommon from '../../public/locales/es/common.json';
import esAuth from '../../public/locales/es/auth.json';
import esVideos from '../../public/locales/es/videos.json';
import esProfile from '../../public/locales/es/profile.json';
import esNavigation from '../../public/locales/es/navigation.json';
import esErrors from '../../public/locales/es/errors.json';
import esNotifications from '../../public/locales/es/notifications.json';
import esWallet from '../../public/locales/es/wallet.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const NAMESPACES = [
  'common',
  'auth',
  'videos',
  'profile',
  'navigation',
  'errors',
  'notifications',
  'wallet',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NS: Namespace = 'common';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        videos: enVideos,
        profile: enProfile,
        navigation: enNavigation,
        errors: enErrors,
        notifications: enNotifications,
        wallet: enWallet,
      },
      es: {
        common: esCommon,
        auth: esAuth,
        videos: esVideos,
        profile: esProfile,
        navigation: esNavigation,
        errors: esErrors,
        notifications: esNotifications,
        wallet: esWallet,
      },
    },

    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: DEFAULT_NS,
    ns: NAMESPACES,

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'buzzy_language',
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (lang: SupportedLanguage): Promise<void> => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  await i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = 'ltr';
};

export default i18n;
