import {
    SUCCESS_GET_SOCIAL_ACCOUNTS,
    FAILED_GET_SOCIAL_ACCOUNTS,
    SUCCESS_DISCONNECT_SOCIAL,
    FAILED_DISCONNECT_SOCIAL,
} from '../type'
import { apiClient } from '../client/api-client'

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook'

/** Obtiene la lista de redes sociales conectadas del usuario actual */
export const getSocialAccounts = () => async (dispatch: any) => {
    try {
        const response = await apiClient.get('/api/social/accounts/')
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_GET_SOCIAL_ACCOUNTS,
                payload: response.data,
            })
            return response.data
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_GET_SOCIAL_ACCOUNTS,
            payload: error.response?.data || error.message,
        })
    }
}

/**
 * Inicia el flujo OAuth para la plataforma dada.
 * El backend responde con { url: "https://platform.com/oauth/..." }
 * y el frontend redirige al usuario a esa URL.
 */
export const initSocialOAuth = (platform: SocialPlatform) => async (dispatch: any) => {
    try {
        const response = await apiClient.get(`/api/social/init/${platform}/`)
        if (response.status === 200 && response.data.url) {
            // Guardar plataforma en sessionStorage para recuperarla en el callback
            sessionStorage.setItem('oauth_platform', platform)
            window.location.href = response.data.url
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_GET_SOCIAL_ACCOUNTS,
            payload: error.response?.data || error.message,
        })
        throw error
    }
}

/** Desconecta una red social del usuario */
export const disconnectSocialAccount = (platform: SocialPlatform) => async (dispatch: any) => {
    try {
        const response = await apiClient.delete(`/api/social/disconnect/${platform}/`)
        if (response.status === 200 || response.status === 204) {
            dispatch({
                type: SUCCESS_DISCONNECT_SOCIAL,
                payload: platform,
            })
            return response.data
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_DISCONNECT_SOCIAL,
            payload: error.response?.data || error.message,
        })
        throw error
    }
}
