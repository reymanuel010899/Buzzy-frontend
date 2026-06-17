import { apiClient } from '../client/api-client';
import {
    SUCCESS_GET_FOLLOWERS,
    FAILED_GET_FOLLOWERS,
    SUCCESS_GET_FOLLOWING,
    FAILED_GET_FOLLOWING,
    SUCCESS_GET_SUBSCRIBERS,
    FAILED_GET_SUBSCRIBERS,
    SUCCESS_GET_SUGGESTIONS,
    FAILED_GET_SUGGESTIONS
} from '../type';

const dedupeByUserId = (list: any[]) => {
    const seen = new Set<string>();
    return list.filter((item: any) => {
        const id = item.user?.id?.toString();
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
};

export const getFollowers = (username: string) => async (dispatch: any) => {
    try {
        const response = await apiClient.get(`/api/followers/${username}/`);
        const data = dedupeByUserId(response.data);
        dispatch({ type: SUCCESS_GET_FOLLOWERS, payload: data, username });
        return data;
    } catch (error) {
        dispatch({ type: FAILED_GET_FOLLOWERS, payload: (error as any)?.message ?? 'error' });
        console.error("Error fetching followers:", error);
        return [];
    }
};

export const getFollowing = (username: string) => async (dispatch: any) => {
    try {
        const response = await apiClient.get(`/api/following/${username}/`);
        const data = dedupeByUserId(response.data);
        dispatch({ type: SUCCESS_GET_FOLLOWING, payload: data, username });
        return data;
    } catch (error) {
        dispatch({ type: FAILED_GET_FOLLOWING, payload: (error as any)?.message ?? 'error' });
        console.error("Error fetching following:", error);
        return [];
    }
};

export const getSubscribers = (username: string) => async (dispatch: any) => {
    try {
        const response = await apiClient.get(`/api/subscriptions/${username}/`);
        const data = dedupeByUserId(response.data);
        dispatch({ type: SUCCESS_GET_SUBSCRIBERS, payload: data, username });
        return data;
    } catch (error) {
        dispatch({ type: FAILED_GET_SUBSCRIBERS, payload: (error as any)?.message ?? 'error' });
        console.error("Error fetching subscribers:", error);
        return [];
    }
};

export const getSuggestions = (username: string) => async (dispatch: any) => {
    try {
        const response = await apiClient.get(`/api/suggestions/${username}/`);
        const data = dedupeByUserId(response.data);
        dispatch({ type: SUCCESS_GET_SUGGESTIONS, payload: data, username });
        return data;
    } catch (error) {
        dispatch({ type: FAILED_GET_SUGGESTIONS, payload: (error as any)?.message ?? 'error' });
        console.error("Error fetching suggestions:", error);
        return [];
    }
};
