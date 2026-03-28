import axios from "axios";
import { AppDispatch } from "../../store";
import { apiClient, getBaseUrl } from "../client/api-client";

// Types
export const SEARCH_START = "SEARCH_START";
export const SEARCH_SUCCESS = "SEARCH_SUCCESS";
export const SEARCH_FAIL = "SEARCH_FAIL";

export const TRENDING_SUCCESS = "TRENDING_SUCCESS";
export const RECENT_SEARCH_SUCCESS = "RECENT_SEARCH_SUCCESS";

const getHeaders = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
    },
});

export const globalSearch = (query: string) => async (dispatch: AppDispatch) => {
    dispatch({ type: SEARCH_START });
    try {
        console.log(getBaseUrl(), "*****")
        const res = await apiClient.get(`${getBaseUrl()}/api/search/global/?q=${query}`);
        console.log("/////////---------//////////", res)
        dispatch({ type: SEARCH_SUCCESS, payload: res.data });
        // Refetch recent searches to update the list
        dispatch(getRecentSearch());
    } catch (err) {
        console.log(err, "****")
        dispatch({ type: SEARCH_FAIL });
    }
};

export const getTrending = () => async (dispatch: AppDispatch) => {
    try {
        const res = await axios.get(`${getBaseUrl()}api/search/trending/`, getHeaders());
        dispatch({ type: TRENDING_SUCCESS, payload: res.data });
    } catch (err) {
        console.error("Error fetching trending:", err);
    }
};

export const getRecentSearch = () => async (dispatch: AppDispatch) => {
    try {
        const res = await axios.get(`${getBaseUrl()}api/search/recent/`, getHeaders());
        dispatch({ type: RECENT_SEARCH_SUCCESS, payload: res.data });
    } catch (err) {
        console.error("Error fetching recent search:", err);
    }
};

export const deleteRecentSearch = (term?: string) => async (dispatch: AppDispatch) => {
    try {
        await axios.delete(`${getBaseUrl()}api/search/recent/`, {
            ...getHeaders(),
            data: { term },
        });
        dispatch(getRecentSearch());
    } catch (err) {
        console.error("Error deleting recent search:", err);
    }
};
