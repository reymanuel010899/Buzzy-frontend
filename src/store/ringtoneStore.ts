import { create } from 'zustand';

export type RingtoneOption = {
  id: string;
  label: string;
  file: string;
};

export const RINGTONE_OPTIONS: RingtoneOption[] = [
  { id: 'choir',    label: '✨ Choir Shine',     file: '/sounds/mixkit-choir-magic-shine-658.wav' },
  { id: 'cinematic',label: '🎬 Cinematic',        file: '/sounds/mixkit-cinematic-swell-stark-transition-2675.wav' },
  { id: 'fantasy',  label: '🧚 Fantasy',          file: '/sounds/mixkit-fantasy-game-success-notification-270.wav' },
  { id: 'melody',   label: '🎵 Melody',           file: '/sounds/mixkit-funny-melody-audio-logo-2984.wav' },
  { id: 'magic',    label: '🪄 Magic Potion',     file: '/sounds/mixkit-magic-potion-music-and-fx-2831.wav' },
  { id: 'bubbles',  label: '🫧 Magic Bubbles',    file: '/sounds/mixkit-magic-bubbles-spell-2999.wav' },
  { id: 'rosa',     label: '🌹 Rosa',             file: '/sounds/rosa.wav' },
  { id: 'thunder',  label: '⚡ Thunder',           file: '/sounds/thunder.mp3' },
];

const STORAGE_KEY = 'buzzy_ringtone';

interface RingtoneState {
  selectedId: string;
  setRingtone: (id: string) => void;
  getFile: () => string;
}

export const useRingtoneStore = create<RingtoneState>((set, get) => ({
  selectedId: localStorage.getItem(STORAGE_KEY) ?? 'choir',
  setRingtone: (id) => {
    localStorage.setItem(STORAGE_KEY, id);
    set({ selectedId: id });
  },
  getFile: () => {
    const { selectedId } = get();
    return RINGTONE_OPTIONS.find(r => r.id === selectedId)?.file
      ?? RINGTONE_OPTIONS[0].file;
  },
}));
