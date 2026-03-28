import {
    SUCCESS_GET_SUBSCRIPTIONS,
    FAILED_GET_SUBSCRIPTIONS,
    SUCCESS_CREATE_CHECKOUT,
    FAILED_CREATE_CHECKOUT
} from '../type'
import { apiClient } from '../client/api-client';

export const getSubscriptionPlans = () => async (dispatch: any) => {
    try {
        const response = await apiClient.get(`/api/subscriptions/plans/`);
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_GET_SUBSCRIPTIONS,
                payload: response.data,
            });
            return response.data;
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_GET_SUBSCRIPTIONS,
            payload: error.response?.data || error.message
        });
        throw error;
    }
};

export const createCheckoutSession = (planId: number, subscribedToId: number) => async (dispatch: any) => {
    try {
        const response = await apiClient.post(`/api/subscriptions/create-checkout-session/`, {
            plan_id: planId,
            subscribed_to_id: subscribedToId
        });
        if (response.status === 200) {
            dispatch({
                type: SUCCESS_CREATE_CHECKOUT,
                payload: response.data,
            });
            // Redirect to Stripe Checkout URL
            if (response.data.url) {
                window.location.href = response.data.url;
            }
            return response.data;
        }
    } catch (error: any) {
        dispatch({
            type: FAILED_CREATE_CHECKOUT,
            payload: error.response?.data || error.message
        });
        throw error;
    }
};

export const startCall = (subscribedToId: number, callType: 'voice' | 'video' = 'voice') => async () => {
    try {
        const response = await apiClient.post(`/api/subscriptions/start-call/`, {
            subscribed_to_id: subscribedToId,
            call_type: callType,
        });
        if (response.status === 200) {
            return response.data;
        }
    } catch (error: any) {
        throw error.response?.data?.error || error.message;
    }
};
