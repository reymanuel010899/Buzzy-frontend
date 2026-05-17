import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateContent } from '@/services/languageService';
import i18n from '@/i18n/config';

interface TranslateButtonProps {
  /** The original text to translate */
  text: string;
  className?: string;
}

/**
 * On-demand translation button for user-generated content.
 * Toggles between original and translated text.
 * No auto-translation — the user must explicitly request it.
 */
export const TranslateButton = ({ text, className = '' }: TranslateButtonProps) => {
  const { t } = useTranslation('videos');
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentLang = i18n.language || 'en';

  const handleTranslate = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }

    if (translated) {
      setShowTranslated(true);
      return;
    }

    setLoading(true);
    const result = await translateContent(text, currentLang);
    setLoading(false);

    if (result) {
      setTranslated(result);
      setShowTranslated(true);
    }
  };

  return (
    <div className={className}>
      {showTranslated && translated && (
        <p className="text-sm text-white/90 mt-1">{translated}</p>
      )}
      <button
        type="button"
        onClick={handleTranslate}
        disabled={loading}
        className={[
          'text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none underline underline-offset-2',
        ].join(' ')}
      >
        {loading
          ? t('translate.translating')
          : showTranslated
            ? t('translate.showOriginal')
            : t('translate.button')}
      </button>
    </div>
  );
};

export default TranslateButton;
