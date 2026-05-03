import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config';
import { useLanguageSync } from '@/hooks/useLanguageSync';

interface LanguageSwitcherProps {
  isAuthenticated?: boolean;
  /** Compact mode: shows flag/code only, no label */
  compact?: boolean;
  className?: string;
}

/**
 * Production-ready language selector.
 *
 * - Keyboard accessible (arrow keys, Enter, Escape)
 * - Closes on outside click
 * - Instant language switching (no page reload)
 * - Persists to backend when authenticated
 */
export const LanguageSwitcher = ({
  isAuthenticated = false,
  compact = false,
  className = '',
}: LanguageSwitcherProps) => {
  const { t } = useTranslation('common');
  const { currentLanguage, changeUserLanguage } = useLanguageSync({ isAuthenticated });

  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      setOpen((prev) => !prev);
      return;
    }
    if (!open) return;
    const items = listRef.current?.querySelectorAll('[role="option"]');
    if (!items) return;
    const focused = document.activeElement;
    const idx = Array.from(items).indexOf(focused as HTMLLIElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (items[(idx + 1) % items.length] as HTMLElement).focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      (items[(idx - 1 + items.length) % items.length] as HTMLElement).focus();
    }
  };

  const handleSelect = async (lang: SupportedLanguage) => {
    if (lang === currentLanguage || changing) return;
    setOpen(false);
    setChanging(true);
    try {
      await changeUserLanguage(lang);
    } finally {
      setChanging(false);
    }
  };

  const FLAG: Record<SupportedLanguage, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.select')}
        onClick={() => setOpen((prev) => !prev)}
        disabled={changing}
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-transparent hover:bg-white/10 transition-colors duration-150',
          'text-sm font-medium text-white/90',
          'border border-white/20 hover:border-white/40',
          'focus:outline-none focus:ring-2 focus:ring-white/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          changing ? 'opacity-60' : '',
        ].join(' ')}
      >
        <span aria-hidden="true">{FLAG[currentLanguage as SupportedLanguage] ?? '🌐'}</span>
        {!compact && (
          <>
            <span>{LANGUAGE_NAMES[currentLanguage as SupportedLanguage] ?? currentLanguage.toUpperCase()}</span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
        {compact && (
          <span className="text-xs font-bold">{currentLanguage.toUpperCase()}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={t('language.select')}
          aria-activedescendant={`lang-option-${currentLanguage}`}
          className={[
            'absolute right-0 mt-1 z-50 min-w-[140px]',
            'bg-neutral-900 border border-white/10 rounded-xl shadow-2xl',
            'py-1 overflow-hidden',
            'animate-in fade-in slide-in-from-top-1 duration-150',
          ].join(' ')}
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang === currentLanguage;
            return (
              <li
                key={lang}
                id={`lang-option-${lang}`}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => handleSelect(lang)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(lang)}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm',
                  'focus:outline-none focus:bg-white/10',
                  'transition-colors duration-100',
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/8 hover:text-white',
                ].join(' ')}
              >
                <span aria-hidden="true">{FLAG[lang]}</span>
                <span className="flex-1">{LANGUAGE_NAMES[lang]}</span>
                {isActive && (
                  <svg
                    className="w-3.5 h-3.5 text-blue-400"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
