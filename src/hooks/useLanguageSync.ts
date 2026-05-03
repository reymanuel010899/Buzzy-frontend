/**
 * useLanguageSync
 *
 * Orchestrates the language lifecycle:
 *   - On mount (authenticated): fetch user's backend preference and apply it
 *   - On language change: persist to backend + update i18next + update <html lang>
 *
 * Usage:
 *   Call once at the top of your authenticated layout.
 *   Call changeUserLanguage from LanguageSwitcher.
 */

import { useCallback, useEffect, useRef } from 'react';
import i18n, { changeLanguage, type SupportedLanguage, SUPPORTED_LANGUAGES } from '@/i18n/config';
import { fetchUserLanguage, updateUserLanguage } from '@/services/languageService';

interface UseLanguageSyncOptions {
  /** Pass `true` when the user is authenticated */
  isAuthenticated: boolean;
}

interface UseLanguageSyncReturn {
  /** Current active language code */
  currentLanguage: SupportedLanguage;
  /** Change language: updates i18next + persists to backend if authenticated */
  changeUserLanguage: (lang: SupportedLanguage) => Promise<void>;
}

export const useLanguageSync = ({
  isAuthenticated,
}: UseLanguageSyncOptions): UseLanguageSyncReturn => {
  // Guard: only sync once per auth session
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasSynced.current) return;

    hasSynced.current = true;

    const syncFromBackend = async () => {
      const backendLang = await fetchUserLanguage();
      if (backendLang && SUPPORTED_LANGUAGES.includes(backendLang)) {
        await changeLanguage(backendLang);
      }
    };

    syncFromBackend();
  }, [isAuthenticated]);

  // Reset the sync guard when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasSynced.current = false;
    }
  }, [isAuthenticated]);

  const changeUserLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      // Optimistic UI — update instantly
      await changeLanguage(lang);

      // Persist to backend for authenticated users
      if (isAuthenticated) {
        try {
          await updateUserLanguage(lang);
        } catch {
          // Non-critical: language is already changed in the UI.
          // Backend will sync on next request via Accept-Language header.
        }
      }
    },
    [isAuthenticated],
  );

  return {
    currentLanguage: (i18n.language ?? 'en') as SupportedLanguage,
    changeUserLanguage,
  };
};
