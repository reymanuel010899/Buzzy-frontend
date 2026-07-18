import { FAILED_CREATE_COMMENT, SUCCEES_CREATE_COMMENT } from '../type'
import { apiClient } from '../client/api-client';

type CreateCommentBody = {
  video_id: string;
  content?: string;
  parent_uuid?: string | null;
  audioBlob?: Blob;
  audioDuration?: number;
  imageFile?: File;
};

export const createComment = (body: CreateCommentBody) => async (dispatch: any) => {
  try {
    let payload: FormData | Omit<CreateCommentBody, 'audioBlob' | 'audioDuration' | 'imageFile'>;
    let config = {};

    if (body.audioBlob || body.imageFile) {
      const fd = new FormData();
      fd.append('video_id', body.video_id);
      if (body.content) fd.append('content', body.content);
      if (body.parent_uuid) fd.append('parent_uuid', body.parent_uuid);
      if (body.audioBlob) {
        fd.append('audio_file', body.audioBlob, 'voice_comment.webm');
        fd.append('audio_duration', String(body.audioDuration ?? 0));
      }
      if (body.imageFile) fd.append('image_file', body.imageFile);
      payload = fd;
      config = { headers: { 'Content-Type': 'multipart/form-data' } };
    } else {
      payload = { video_id: body.video_id, content: body.content ?? '', parent_uuid: body.parent_uuid };
    }

    const response = await apiClient.post('/api/create-comment/', payload, config);
    if (response.status === 200 || response.status === 201) {
      dispatch({
        type: SUCCEES_CREATE_COMMENT,
        payload: response.data?.data ?? response.data,
      });
      return response.data?.data ?? response.data;
    }

  } catch (error) {
    dispatch({
      type: FAILED_CREATE_COMMENT,
      payload: ''
    });
    // Relanzar: si se traga el error, el .catch del caller nunca corre y el
    // usuario pierde su comentario (texto/audio/imagen) sin ningún aviso.
    throw error;
  }
};
