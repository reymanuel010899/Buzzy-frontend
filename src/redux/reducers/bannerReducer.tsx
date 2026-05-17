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
  expires_at: string | null;
  created_at: string;
}

interface BannerState {
  banner: BannerData | null;
  dismissed: boolean;
}

const initialState: BannerState = {
  banner: null,
  dismissed: false,
};

const bannerReducer = (state = initialState, action: any): BannerState => {
  switch (action.type) {
    case SUCCESS_GET_BANNER:
      return { banner: action.payload, dismissed: false };
    case FAILED_GET_BANNER:
      return { ...state, banner: null };
    case DISMISS_BANNER:
      return { ...state, dismissed: true };
    default:
      return state;
  }
};

export default bannerReducer;
