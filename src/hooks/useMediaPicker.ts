import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Capacitor } from "@capacitor/core";

export type MediaType = "image" | "video" | "any";
type MediaSource = "library" | "camera";

export interface PickedFile {
  file: File;
  url: string;
}

const isNative = () => Capacitor.isNativePlatform();

const getAccept = (type: MediaType) =>
  type === "image" ? "image/*" :
  type === "video" ? "video/*" :
  "image/*,video/*";

export async function pickMedia(type: MediaType, maxSizeMb = 50, source: MediaSource = "library"): Promise<PickedFile | null> {
  const accept =
    type === "image" ? "image/*" :
    type === "video" ? "video/mp4,video/quicktime,video/webm" :
    "video/mp4,video/quicktime,image/jpeg,image/png,image/webp";

  if (isNative() && type === "image") {
    return pickNativeImage(maxSizeMb, source);
  }

  if (source === "camera") {
    return pickViaInput(getAccept(type), maxSizeMb, true);
  }

  if (isNative()) {
    return pickNative(type, maxSizeMb, accept);
  }

  return pickViaInput(accept, maxSizeMb);
}

/**
 * After a native picker activity closes, the Capacitor WebView is in the
 * middle of resuming. Resolves once the document is visible again and the
 * browser has had a chance to paint, so a setState that runs right after the
 * picker returns gets committed and rendered (instead of waiting for the next
 * user interaction). Has a hard timeout so it never hangs.
 */
function waitForWebViewResume(timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      document.removeEventListener("visibilitychange", onVisible);
      // Double rAF guarantees the WebView has resumed and painted a frame.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") finish();
    };

    if (document.visibilityState === "visible") {
      finish();
    } else {
      document.addEventListener("visibilitychange", onVisible);
      setTimeout(finish, timeoutMs);
    }
  });
}

async function dataUrlToFile(dataUrl: string, filename: string, mimeType: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
}

async function pickNativeImage(maxSizeMb: number, source: MediaSource): Promise<PickedFile | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Prompt,
      quality: 90,
    });

    if (!photo.dataUrl) return null;

    const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
    const ext = photo.format || "jpg";
    const file = await dataUrlToFile(photo.dataUrl, `photo.${ext}`, mimeType);

    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`El archivo es demasiado grande. El máximo es ${maxSizeMb}MB.`);
      return null;
    }

    return { file, url: photo.dataUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("user cancel")) return null;
    console.error("[pickNativeImage error]", err);
    return pickViaInput("image/*", maxSizeMb, source === "camera");
  }
}

async function pickNative(type: MediaType, maxSizeMb: number, _fallbackAccept: string): Promise<PickedFile | null> {
  try {
    try {
      await FilePicker.requestPermissions({ permissions: ["readExternalStorage"] });
    } catch { /* Android Photo Picker may not need this */ }

    let result;
    if (type === "video") {
      result = await FilePicker.pickVideos({ limit: 1, readData: true });
    } else if (type === "image") {
      result = await FilePicker.pickImages({ limit: 1, readData: true });
    } else {
      result = await FilePicker.pickMedia({ limit: 1, readData: true });
    }

    const picked = result.files?.[0];
    if (!picked) return null;

    const mimeType = picked.mimeType || (type === "video" ? "video/mp4" : "image/jpeg");
    const name = picked.name || (type === "video" ? "video.mp4" : "photo.jpg");

    if (!picked.data) {
      alert("No se pudo leer el archivo. Intenta de nuevo.");
      return null;
    }

    // Decode base64 in chunks to avoid call stack overflow on large files
    const b64 = picked.data;
    const sliceSize = 512;
    const byteArrays: Uint8Array[] = [];
    for (let offset = 0; offset < b64.length; offset += sliceSize) {
      const slice = b64.slice(offset, offset + sliceSize);
      const decoded = atob(slice);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      byteArrays.push(bytes);
    }
    const blob = new Blob(byteArrays, { type: mimeType });

    if (blob.size > maxSizeMb * 1024 * 1024) {
      alert(`El archivo es demasiado grande. El máximo es ${maxSizeMb}MB.`);
      return null;
    }

    const file = new File([blob], name, { type: mimeType });

    // When the native gallery activity closes, the WebView is resuming and
    // React state updates triggered synchronously here may not get flushed to
    // a paint until the next user interaction. Yield until the WebView has
    // actually resumed (two animation frames) so the caller's setState renders.
    await waitForWebViewResume();

    return { file, url: URL.createObjectURL(file) };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("user cancel")) return null;
    console.error("[pickNative error]", err);
    alert("Error al seleccionar archivo: " + msg);
    return null;
  }
}

function pickViaInput(accept: string, maxSizeMb: number, capture = false): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (capture) input.setAttribute("capture", "environment");
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
      resolve({ file, url: URL.createObjectURL(file) });
    };

    input.oncancel = () => { document.body.removeChild(input); resolve(null); };
    input.click();
  });
}
