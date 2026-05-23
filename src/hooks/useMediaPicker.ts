import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export type MediaType = "image" | "video" | "any";

export interface PickedFile {
  file: File;
  url: string;
}

const isNative = () => Capacitor.isNativePlatform();

async function dataUrlToFile(dataUrl: string, filename: string, mimeType: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
}

export async function pickMedia(type: MediaType, maxSizeMb = 50): Promise<PickedFile | null> {
  if (isNative() && type !== "video") {
    // Capacitor Camera — for images on native (shows gallery + camera options)
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 90,
    });
    if (!photo.dataUrl) return null;
    const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
    const ext = photo.format || "jpg";
    const file = await dataUrlToFile(photo.dataUrl, `photo.${ext}`, mimeType);
    return { file, url: photo.dataUrl };
  }

  if (isNative() && type === "video") {
    // On Android WebView, blob URLs from file inputs can't be played or uploaded
    // reliably. We read the file into memory immediately so both preview and
    // upload work with real in-memory bytes.
    return pickViaInputNativeVideo(maxSizeMb);
  }

  // Web fallback
  const accept =
    type === "image" ? "image/*" :
    type === "video" ? "video/mp4,video/quicktime,video/webm" :
    "video/mp4,video/quicktime,image/jpeg,image/png,image/webp";
  return pickViaInput(accept, maxSizeMb);
}

/**
 * Android-specific video picker: reads the file into memory as ArrayBuffer
 * so the blob URL works in WebView for both preview and upload.
 */
function pickViaInputNativeVideo(maxSizeMb: number): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }
      if (file.size > maxSizeMb * 1024 * 1024) {
        alert(`El archivo es demasiado grande. El máximo es ${maxSizeMb}MB.`);
        resolve(null);
        return;
      }
      // Read fully into memory — bypasses Android WebView blob URL restrictions
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) { resolve(null); return; }
        const mimeType = file.type || "video/mp4";
        const inMemoryFile = new File([buffer], file.name, { type: mimeType });
        const url = URL.createObjectURL(inMemoryFile);
        resolve({ file: inMemoryFile, url });
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
}

function pickViaInput(accept: string, maxSizeMb: number): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }
      if (file.size > maxSizeMb * 1024 * 1024) {
        alert(`El archivo es demasiado grande. El máximo es ${maxSizeMb}MB.`);
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(file);
      resolve({ file, url });
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
}
