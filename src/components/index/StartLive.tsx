import { useRef, useState } from "react";

const ScreenRecorder = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // 🟢 Iniciar compartir pantalla con audio
  const startScreenShare = async () => {
    try {
      // 1️⃣ Capturar pantalla con audio del sistema
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // Esto habilita el audio del sistema
      });

      // 2️⃣ Capturar micrófono (opcional)
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3️⃣ Combinar pantalla + micrófono
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream;
      }

      // 4️⃣ Configurar grabador
      const recorder = new MediaRecorder(combinedStream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };
      recorder.start();

      setMediaRecorder(recorder);
      setStream(combinedStream);
    } catch (error) {
      console.error("Error al compartir pantalla con audio:", error);
    }
  };

  // 🔴 Detener grabación
  const stopRecording = () => {
    mediaRecorder?.stop();
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  // 📥 Descargar grabación
  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "screen-recording-with-audio.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center">
      <h2>Grabar Pantalla con Audio</h2>
      <video ref={videoRef} autoPlay className="w-full h-96 bg-black"></video>

      <div className="mt-4 flex gap-4">
        <button onClick={startScreenShare} className="px-4 py-2 bg-blue-500 text-white rounded">Iniciar</button>
        <button onClick={stopRecording} className="px-4 py-2 bg-red-500 text-white rounded">Detener</button>
        <button onClick={downloadRecording} className="px-4 py-2 bg-green-500 text-white rounded">Descargar</button>
      </div>
    </div>
  );
};

export default ScreenRecorder;
