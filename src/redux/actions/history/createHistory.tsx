import axios from "axios";
import apiClient from "../../client/api-client";
import {
  SUCCEES_CREATE_STORY,
  FAILED_CREATE_STORY
} from "../../type";


export const createStory = (data: FormData) => async (dispatch: any) => {
  try {
    const token = localStorage.getItem("accessToken");

    const response = await axios.post(
      "http://127.0.0.1:8000/media/api/stories/create/",
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    dispatch({
      type: SUCCEES_CREATE_STORY,
      payload: response.data,
    });
    return response.data
  } catch (error) {
    dispatch({
      type: FAILED_CREATE_STORY,
      payload: error,
    });
  }
};
