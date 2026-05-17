const UPLOAD_START = 'UPLOAD/START'
const UPLOAD_DONE = 'UPLOAD/DONE'
const UPLOAD_RESET = 'UPLOAD/RESET'

interface UploadProgressState {
    isUploading: boolean
    videoId: number | null
    status: 'idle' | 'uploading' | 'done' | 'blocked' | 'error'
    safetyLabel: string | null
}

const initialState: UploadProgressState = {
    isUploading: false,
    videoId: null,
    status: 'idle',
    safetyLabel: null,
}

export const startUpload = (videoId: number) => ({ type: UPLOAD_START, payload: videoId })
export const completeUpload = (status: 'done' | 'blocked' | 'error', safetyLabel?: string) => ({
    type: UPLOAD_DONE,
    payload: { status, safetyLabel: safetyLabel || null },
})
export const resetUpload = () => ({ type: UPLOAD_RESET })

const uploadProgressReducer = (state = initialState, action: any): UploadProgressState => {
    switch (action.type) {
        case UPLOAD_START:
            return { isUploading: true, videoId: action.payload, status: 'uploading', safetyLabel: null }
        case UPLOAD_DONE:
            return {
                ...state,
                isUploading: false,
                status: action.payload.status,
                safetyLabel: action.payload.safetyLabel,
            }
        case UPLOAD_RESET:
            return initialState
        default:
            return state
    }
}

export default uploadProgressReducer
