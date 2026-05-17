import { apiClient } from '@/redux/client/api-client';
import type { SupportedLanguage } from '@/i18n/config';

interface LanguageResponse {
  language: SupportedLanguage;
}

/**
 * Fetch the authenticated user's stored language preference from the backend.
 * Called once after login.
 */
export const fetchUserLanguage = async (): Promise<SupportedLanguage | null> => {
  try {
    const { data } = await apiClient.get<LanguageResponse>('api/user/language/');
    return data.language;
  } catch {
    // Network error or unauthenticated — fall through to browser detection
    return null;
  }
};

/**
 * Persist the user's language choice to the backend.
 * Called whenever the user explicitly changes their language.
 */
export const updateUserLanguage = async (lang: SupportedLanguage): Promise<void> => {
  await apiClient.patch('api/user/language/', { language: lang });
};

/**
 * Translate a piece of user-generated content on demand.
 * Returns the translated text or null on failure.
 */
export const translateContent = async (
  text: string,
  targetLang: string,
): Promise<string | null> => {
  try {
    const { data } = await apiClient.post<{ translated: string; provider: string }>(
      'api/translate/',
      { text, target_language: targetLang },
    );
    return data.translated;
  } catch {
    return null;
  }
};
