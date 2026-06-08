export interface Video {
  uuid?: string
  id: number;
  latitude: string;
  longitude: string;
  category: number;
  comments_count: number;
  view_acount: number;
  created_at: string; // Se podría usar Date si se transforma antes de usar
  description: string;
  duration: number;
  like_count: number;
  tags?: { tags: string[] };
  thumbnail_url: string;
  updated_at: string; // También podría ser Date si se convierte
  current_user_followered: boolean;
  is_saved?: boolean;
  user_id: {
    id: string
    email: string;
    username: string;
    profile_picture: string;
  };
  video_url: string;
  video: string;
  liked?: boolean
  media_type?: 'video' | 'image'
  audio_track_url?: string | null;
  audio_track_id?: string | null;
  audio_track_title?: string | null;
  audio_track_artist?: string | null;
  audio_track_cover?: string | null;
  volume_original?: number;
  volume_music?: number;
  audio_trim_start?: number;
  audio_trim_end?: number | null;
}

export interface StoryUser {
  id: number;
  username: string;
  email: string;
  profile_picture: string | null;
}

export interface StoryMedia {
  uuid: string
  id: number;
  file: string;
  type: "image" | "video";
  order: number;
  story: number;
}

export interface StoryTextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
}

export interface StoryStickerLayer {
  id: string;
  kind?: "emoji" | "location" | "image" | "video";
  emoji?: string;
  text?: string;
  src?: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
}

export interface Story {
  id: number;
  media: StoryMedia[];
  total_views: number;
  uuid: string;
  text: string | null;
  is_active: boolean;
  created_at: string;
  user: StoryUser;
  location?: string | null;
  audio_track_url?: string | null;
  audio_track_title?: string | null;
  audio_track_artist?: string | null;
  audio_volume_music?: number;
  audio_trim_start?: number;
  audio_trim_end?: number;
  filter_css?: string | null;
  text_layers?: StoryTextLayer[];
  sticker_layers?: StoryStickerLayer[];
}

export type StoryList = Story[];

export interface Gift {
  id: number;
  name: string;
  slug: string;
  video: string;
  token_price: number;
  is_active: boolean;
  created_at: string;
}
