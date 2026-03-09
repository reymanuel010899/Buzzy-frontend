import {
    SUCCESS_SAVE_AVAILABILITY,
    FAILED_SAVE_AVAILABILITY,
    SUCCESS_GET_AVAILABILITY,
    FAILED_GET_AVAILABILITY,
} from '../type'
import { apiClient } from '../client/api-client'

export interface AvailabilityPayload {
    start_time: string   // "08:00"
    end_time: string     // "20:00"
    days: number[]       // [0,1,2,3,4,5,6] — índices lunes=0 … domingo=6
}

export const saveAvailability = (payload: AvailabilityPayload) => async (dispatch: any) => {
    try {
        const response = await apiClient.post('/api/save-availability-user/', payload)
        if (response.status === 200 || response.status === 201) {
            dispatch({
                type: SUCCESS_SAVE_AVAILABILITY,
                payload: response.data,
            })
            return response.data
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_SAVE_AVAILABILITY,
            payload: error.response?.data || error.message,
        })
        throw error
    }
}

export const getAvailability = () => async (dispatch: any) => {
    try {
        const response = await apiClient.get('/api/get-availability-user/')
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_GET_AVAILABILITY,
                payload: response.data,
            })
            return response.data
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_GET_AVAILABILITY,
            payload: error.response?.data || error.message,
        })
        throw error
    }
}

export const getAvailabilityStatus = (username: string) => async () => {
    try {
        const response = await apiClient.get(`/api/availability-status/${username}/`)
        if (response.status === 200) {
            return response.data
        }
    } catch (error: any) {
        console.error("Error fetching availability status:", error)
        throw error
    }
}
