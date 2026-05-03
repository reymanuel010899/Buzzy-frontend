/**
 * TypeScript augmentation for i18next.
 *
 * This gives full autocompletion and type-safety on t('key') calls.
 * When adding a new namespace:
 *   1. Add the JSON file in public/locales/{lang}/{ns}.json
 *   2. Import it here as a type
 *   3. Add it to the resources map below
 */

// Import translation files as types only (never bundled — just for type inference)
import type commonEn from '../../public/locales/en/common.json';
import type authEn from '../../public/locales/en/auth.json';
import type videosEn from '../../public/locales/en/videos.json';
import type profileEn from '../../public/locales/en/profile.json';
import type navigationEn from '../../public/locales/en/navigation.json';
import type errorsEn from '../../public/locales/en/errors.json';
import type notificationsEn from '../../public/locales/en/notifications.json';
import type walletEn from '../../public/locales/en/wallet.json';

/**
 * Augment the i18next module so TypeScript enforces valid keys everywhere.
 * `t('nonExistentKey')` will be a compile-time error.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof commonEn;
      auth: typeof authEn;
      videos: typeof videosEn;
      profile: typeof profileEn;
      navigation: typeof navigationEn;
      errors: typeof errorsEn;
      notifications: typeof notificationsEn;
      wallet: typeof walletEn;
    };
  }
}
