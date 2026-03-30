import { create } from 'zustand';

export type CallPayload = {
    uuid: string;
    channel_name: string;
    call_type: "voice" | "video";
    allowed_seconds: number;
    status?: string;
    caller: { id: number; username: string; profile_picture?: string };
    callee?: { id: number; username: string; profile_picture?: string };
    agora_uid_caller?: number;
    agora_uid_callee?: number;
    token?: string;
    app_id?: string;
};

interface CallState {
    activeOutgoingCall: CallPayload | null;
    activeIncomingCall: CallPayload | null;
    agoraDataRef: { appId: string; token: string; uid: number } | null;
    setActiveOutgoingCall: (call: CallPayload | null | ((prev: CallPayload | null) => CallPayload | null)) => void;
    setActiveIncomingCall: (call: CallPayload | null | ((prev: CallPayload | null) => CallPayload | null)) => void;
    setAgoraData: (data: { appId: string; token: string; uid: number } | null) => void;
}

export const useCallStore = create<CallState>((set) => ({
    activeOutgoingCall: null,
    activeIncomingCall: null,
    agoraDataRef: null,
    setActiveOutgoingCall: (callOrUpdater) => set((state) => ({
        activeOutgoingCall: typeof callOrUpdater === 'function' ? callOrUpdater(state.activeOutgoingCall) : callOrUpdater
    })),
    setActiveIncomingCall: (callOrUpdater) => set((state) => ({
        activeIncomingCall: typeof callOrUpdater === 'function' ? callOrUpdater(state.activeIncomingCall) : callOrUpdater
    })),
    setAgoraData: (data) => set({ agoraDataRef: data }),
}));
