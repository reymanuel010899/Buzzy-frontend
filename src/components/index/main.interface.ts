export interface Video {
    id: number;
    category: number;
    comments_count: number;
    created_at: string; // Se podría usar Date si se transforma antes de usar
    description: string;
    duration: number;
    likes_count: number;
    tags: string[];
    thumbnail_url: string;
    updated_at: string; // También podría ser Date si se convierte
    user_id: {
        id: number;
        username: string;
        profile_picture: string;
    };
    video_url: string;
    video: string;
}
