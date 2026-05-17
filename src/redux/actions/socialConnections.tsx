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

export const getFollowers = (username: string) => async (dispatch: any, getState: any) => {
    const { socialConnections } = getState();
    if (socialConnections.followers[username]) {
        return socialConnections.followers[username];
    }

    try {
        const response = await apiClient.get(`/api/followers/${username}/`);
        dispatch({ type: SUCCESS_GET_FOLLOWERS, payload: response.data, username });
        return response.data;
    } catch (error) {
        dispatch({ type: FAILED_GET_FOLLOWERS, payload: error });
        console.error("Error fetching followers:", error);
        return [];
    }
};

export const getFollowing = (username: string) => async (dispatch: any, getState: any) => {
    const { socialConnections } = getState();
    if (socialConnections.following[username]) {
        return socialConnections.following[username];
    }

    try {
        const response = await apiClient.get(`/api/following/${username}/`);
        dispatch({ type: SUCCESS_GET_FOLLOWING, payload: response.data, username });
        return response.data;
    } catch (error) {
        dispatch({ type: FAILED_GET_FOLLOWING, payload: error });
        console.error("Error fetching following:", error);
        return [];
    }
};

export const getSubscribers = (username: string) => async (dispatch: any, getState: any) => {
    const { socialConnections } = getState();
    if (socialConnections.subscribers[username]) {
        return socialConnections.subscribers[username];
    }

    try {
        const response = await apiClient.get(`/api/subscriptions/${username}/`);
        dispatch({ type: SUCCESS_GET_SUBSCRIBERS, payload: response.data, username });
        return response.data;
    } catch (error) {
        dispatch({ type: FAILED_GET_SUBSCRIBERS, payload: error });
        console.error("Error fetching subscribers:", error);
        return [];
    }
};

export const getSuggestions = (username: string) => async (dispatch: any, getState: any) => {
    const { socialConnections } = getState();
    if (socialConnections.suggestions[username]) {
        return socialConnections.suggestions[username];
    }

    try {
        const response = await apiClient.get(`/api/suggestions/${username}/`);
        dispatch({ type: SUCCESS_GET_SUGGESTIONS, payload: response.data, username });
        return response.data;
    } catch (error) {
        dispatch({ type: FAILED_GET_SUGGESTIONS, payload: error });
        console.error("Error fetching suggestions:", error);
        return [];
    }
};
