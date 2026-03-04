export interface GiftI {
    id?: string | number;
    uuid?: string;
    name: string;
    slug: string;
    emoji: string;
    video: string | null;
    cost?: string | number
    color?: string
    animation?: string
    token_price: number;
    is_active: boolean;
    created_at: string; 
  }
  