import { AppDispatch } from "../../store";
import { apiClient } from "../client/api-client";

// Types
export const SEARCH_START = "SEARCH_START";
export const SEARCH_SUCCESS = "SEARCH_SUCCESS";
export const SEARCH_FAIL = "SEARCH_FAIL";

export const TRENDING_SUCCESS = "TRENDING_SUCCESS";
export const RECENT_SEARCH_SUCCESS = "RECENT_SEARCH_SUCCESS";

const asSearchList = (data: any) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

export const globalSearch = (query: string) => async (dispatch: AppDispatch) => {
    dispatch({ type: SEARCH_START });
    try {
        const res = await apiClient.get(`/api/search/global/?q=${encodeURIComponent(query)}`);
        dispatch({
            type: SEARCH_SUCCESS,
            payload: {
                users: Array.isArray(res.data?.users) ? res.data.users : [],
                videos: Array.isArray(res.data?.videos) ? res.data.videos : [],
            },
        });
        dispatch(getRecentSearch());
    } catch (err) {
        console.error("Error en búsqueda:", err);
        dispatch({ type: SEARCH_FAIL });
    }
};

export const getTrending = () => async (dispatch: AppDispatch) => {
    try {
        const res = await apiClient.get(`/api/search/trending/`);
        dispatch({ type: TRENDING_SUCCESS, payload: asSearchList(res.data) });
    } catch (err) {
        console.error("Error fetching trending:", err);
    }
};

export const getRecentSearch = () => async (dispatch: AppDispatch) => {
    try {
        const res = await apiClient.get(`/api/search/recent/`);
        dispatch({ type: RECENT_SEARCH_SUCCESS, payload: asSearchList(res.data) });
    } catch (err) {
        console.error("Error fetching recent search:", err);
    }
};

export const deleteRecentSearch = (term?: string) => async (dispatch: AppDispatch) => {
    try {
        await apiClient.delete(`/api/search/recent/`, { data: { term } });
        dispatch(getRecentSearch());
    } catch (err) {
        console.error("Error deleting recent search:", err);
    }
};
