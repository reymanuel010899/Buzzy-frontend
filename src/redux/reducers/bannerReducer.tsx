import { SUCCESS_GET_BANNER, FAILED_GET_BANNER, DISMISS_BANNER } from '../type';

export interface BannerData {
  id: number;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'ALERT' | 'ACHIEVEMENT' | 'PRIZE' | 'OFFER';
  effect: 'PARTICLES' | 'HOLOGRAPHIC' | 'SCRATCH' | 'NARRATIVE' | 'COUNTDOWN' | 'NONE';
  background_color: string;
  text_color: string;
  accent_color: string;
  reveal_content: string;
  countdown_label: string;
  image_url: string | null;
  action_url: string | null;
  action_label: string | null;
  priority: number;
  expires_at: string | null;
  created_at: string;
}

interface BannerState {
  queue: BannerData[];   // todos los banners pendientes
  currentIndex: number;  // cuál está mostrando ahora
}

const initialState: BannerState = {
  queue: [],
  currentIndex: 0,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bannerReducer = (state = initialState, action: any): BannerState => {
  switch (action.type) {
    case SUCCESS_GET_BANNER:
      return { queue: action.payload ?? [], currentIndex: 0 };
    case FAILED_GET_BANNER:
      return { ...state, queue: [] };
    case DISMISS_BANNER:
      // avanza al siguiente; si no hay más, limpia
      return {
        queue: state.queue,
        currentIndex: state.currentIndex + 1,
      };
    default:
      return state;
  }
};

export default bannerReducer;
