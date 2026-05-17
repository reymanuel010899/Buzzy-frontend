import { useState, useRef, useCallback, useEffect } from 'react'

export type RecordingState = 'idle' | 'recording' | 'preview'

export interface AudioRecording {
  blob: Blob
  url: string
  duration: number  // seconds
}

const MAX_SECONDS = 10

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>('idle')
  const [elapsed, setElapsed] = useState(0)          // seconds recorded
  const [recording, setRecording] = useState<AudioRecording | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const startTimeRef     = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (recording) URL.revokeObjectURL(recording.url)
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url  = URL.createObjectURL(blob)
        setRecording({ blob, url, duration: Math.min(duration, MAX_SECONDS) })
        setState('preview')
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      recorder.start(100) // collect every 100ms
      startTimeRef.current = Date.now()
      setState('recording')
      setElapsed(0)

      // Auto-stop at 10s
      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000
        setElapsed(Math.min(secs, MAX_SECONDS))
        if (secs >= MAX_SECONDS) stopRecording()
      }, 100)

    } catch (err) {
      console.error('[useAudioRecorder] microphone access denied:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    stopTimer()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    stopTimer()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (recording) URL.revokeObjectURL(recording.url)
    setRecording(null)
    setElapsed(0)
    setState('idle')
  }, [recording])

  const reset = useCallback(() => {
    if (recording) URL.revokeObjectURL(recording.url)
    setRecording(null)
    setElapsed(0)
    setState('idle')
  }, [recording])

  return {
    state,
    elapsed,
    recording,
    maxSeconds: MAX_SECONDS,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  }
}
