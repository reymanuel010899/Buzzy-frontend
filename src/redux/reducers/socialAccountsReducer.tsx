import {
    SUCCESS_GET_SOCIAL_ACCOUNTS,
    FAILED_GET_SOCIAL_ACCOUNTS,
    SUCCESS_DISCONNECT_SOCIAL,
    FAILED_DISCONNECT_SOCIAL,
} from '../type'

export interface SocialAccount {
    platform: 'instagram' | 'tiktok' | 'facebook'
    platform_username: string
    platform_user_id: string
    followers_count: number
    connected_at: string
}

interface SocialAccountsState {
    accounts: SocialAccount[]
    loading: boolean
    error: string | null
}

const initialState: SocialAccountsState = {
    accounts: [],
    loading: false,
    error: null,
}

export default function socialAccountsReducer(state = initialState, action: any): SocialAccountsState {
    switch (action.type) {
        case SUCCESS_GET_SOCIAL_ACCOUNTS:
            return {
                ...state,
                accounts: action.payload,
                loading: false,
                error: null,
            }
        case FAILED_GET_SOCIAL_ACCOUNTS:
            return {
                ...state,
                loading: false,
                error: action.payload,
            }
        case SUCCESS_DISCONNECT_SOCIAL:
            return {
                ...state,
                // Quita de la lista la plataforma desconectada
                accounts: state.accounts.filter(a => a.platform !== action.payload),
                loading: false,
                error: null,
            }
        case FAILED_DISCONNECT_SOCIAL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            }
        default:
            return state
    }
}
