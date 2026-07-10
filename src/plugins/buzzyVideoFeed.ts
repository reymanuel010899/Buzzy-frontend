import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * Feed de video NATIVO con scroll nativo (ViewPager2 + ExoPlayer) detrás del
 * WebView. El nativo maneja scroll Y video; avisa al JS con 'pageChanged' cuando
 * el swipe cambia de video. Solo Android; en web es no-op.
 */
export interface BuzzyVideoFeedPlugin {
  /**
   * Inserta el feed nativo detrás del WebView. Arranca en `startIndex` (default 0).
   * El perfil pasa startIndex para abrir directo en el video tocado (sin destello del 0).
   */
  show(options: { videoUrls: string[]; startIndex?: number }): Promise<void>;
  /** Agrega más videos al final del feed (paginación infinita). */
  appendUrls(options: { videoUrls: string[] }): Promise<void>;
  /** Reemplaza toda la lista del feed y reinicia en la página 0 (cambio de tab). */
  replaceUrls(options: { videoUrls: string[] }): Promise<void>;
  /** Mueve el pager a un índice (sincronización desde JS si hace falta). */
  setActive(options: { index: number }): Promise<void>;
  /** Recarga el video activo con una URL fresca (re-firma tras 403 por firma vencida). */
  playUrl(options: { url: string }): Promise<void>;
  /**
   * Música NATIVA del video activo (segundo ExoPlayer). url vacío = sin música.
   * trimStart en segundos. Volúmenes 0..1.
   */
  setMusic(options: {
    url: string;
    volumeMusic?: number;
    volumeOriginal?: number;
    /** Inicio del recorte en segundos. */
    trimStart?: number;
    /** Fin del recorte en segundos (0 = sin recorte final, suena hasta el final). */
    trimEnd?: number;
  }): Promise<void>;
  /**
   * Pre-bufera EN PAUSA la música del SIGUIENTE slide horizontal para que, al llegar
   * a ese slide, suene al instante (baja latencia). trim en segundos. url vacío = no-op.
   */
  prefetchMusic(options: {
    url: string;
    trimStart?: number;
    trimEnd?: number;
  }): Promise<void>;
  /** Libera la música prebuferada (al hacer scroll vertical → no acumular memoria). */
  clearMusicPrefetch(): Promise<void>;
  /** Pausa/reanuda el video de la página actual. */
  setPaused(options: { paused: boolean }): Promise<void>;
  /**
   * Corta el audio (video + música) durante un arrastre del carrusel HORIZONTAL.
   * pausing=true al empezar a arrastrar de lado, false al soltar. Evita oír el audio
   * del slide que se deja durante la transición (el scroll vertical lo hace solo).
   */
  setScrollPausing(options: { pausing: boolean }): Promise<void>;
  /** Silencia/activa el feed nativo (video + música). */
  setMuted(options: { muted: boolean }): Promise<void>;
  /** Habilita/bloquea el scroll del feed (bloquear con un modal HTML encima). */
  setScrollEnabled(options: { enabled: boolean }): Promise<void>;
  /** Muestra/oculta el feed nativo SIN destruirlo (al salir/volver del feed). */
  setVisible(options: { visible: boolean }): Promise<void>;
  /**
   * Revela el feed nativo (que show() insertó INVISIBLE). Llamar cuando el chrome
   * del WebView (navbar/historias/tabs) ya pintó → video y UI aparecen JUNTOS.
   */
  reveal(): Promise<void>;
  /**
   * Márgenes (px CSS) para que el video NO quede detrás del navbar (top) ni del
   * nav inferior (bottom) → el avatar del autor se ve por fuera del header.
   */
  setInsets(options: { top?: number; bottom?: number }): Promise<void>;
  /** Quita el feed nativo y restaura el WebView. */
  hide(): Promise<void>;
  /** El nativo avisa cuándo el swipe cambió de video. */
  addListener(
    eventName: 'pageChanged',
    listener: (data: { index: number }) => void,
  ): Promise<PluginListenerHandle>;
  /**
   * Progreso periódico (~300ms) del video activo, en milisegundos. Para la barra
   * de progreso y disparar vistas/métricas por tiempo (Fase 3.4).
   */
  addListener(
    eventName: 'progress',
    listener: (data: { index: number; position: number; duration: number }) => void,
  ): Promise<PluginListenerHandle>;
  /**
   * Estado del scroll del feed: scrolling=true mientras el usuario arrastra/asienta
   * (ocultar la UI HTML para no mostrar data del video viejo); false al quedar quieto.
   */
  addListener(
    eventName: 'scrollState',
    listener: (data: { scrolling: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  /**
   * Un video falló al reproducir (típicamente 403 por URL firmada vencida). El JS
   * debe re-firmar la URL del video activo (GET /api/videos/<uuid>/) y reproducirla
   * de nuevo con playUrl + setMusic.
   */
  addListener(
    eventName: 'playerError',
    listener: (data: { index: number }) => void,
  ): Promise<PluginListenerHandle>;
  /** Quita TODOS los listeners de este plugin (evita acumular duplicados). */
  removeAllListeners(): Promise<void>;
}

export const BuzzyVideoFeed = registerPlugin<BuzzyVideoFeedPlugin>('BuzzyVideoFeed');
