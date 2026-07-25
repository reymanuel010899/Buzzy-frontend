package com.buzzy.app;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.ClippingMediaSource;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.ui.PlayerView;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.ViewPager2;

import java.util.List;

/**
 * Adapter del feed: una PlayerView por página. Para no agotar el pool de decoders
 * de Android, mantenemos UN solo ExoPlayer y lo ADJUNTAMOS a la página activa
 * (TikTok hace algo parecido). Al cambiar de página, el player se mueve a la nueva
 * PlayerView y reproduce ese video.
 */
@OptIn(markerClass = UnstableApi.class)
public class VideoPagerAdapter extends RecyclerView.Adapter<VideoPagerAdapter.PageHolder> {

    private final Context context;
    private final List<String> urls;
    private int activePos = -1;
    // POOL de 3 ExoPlayers (como TikTok): mantenemos un player por cada página de la
    // VENTANA [activo-1, activo, activo+1], cada uno PEGADO a su PlayerView mostrando
    // su 1er frame. Así, arrastres ARRIBA o ABAJO, ya se ve el frame del video
    // destino subir pegado (sin hueco negro). Solo el activo REPRODUCE; los vecinos
    // están pausados con su frame visible. Map posición→player.
    private final java.util.HashMap<Integer, ExoPlayer> pool = new java.util.HashMap<>();
    // Referencia al pager (la guarda setActivePage) para poder preparar players desde
    // onBindViewHolder cuando una vista se enlaza antes de tener su player listo.
    private ViewPager2 pagerRef;
    // El feed arranca PAUSADO (candado). El JS lo reanuda con setPaused(false) al
    // primer tap. Este flag se respeta al cambiar de página.
    private boolean globalPaused = true;

    // ── Música 100% NATIVA (segundo ExoPlayer dedicado, como TikTok) ────────────
    // El video lo reproduce `player`; la música (audio_track) la reproduce
    // `musicPlayer`. Se sincronizan en play/pause/cambio de video. Esto permite
    // volumen independiente (video bajo, música alta), trim (seek) y loop nativos,
    // SIN <audio> HTML.
    private ExoPlayer musicPlayer;
    private String currentMusicUrl;          // URL de música cargada actualmente
    private long currentTrimStartMs = -1;    // recorte cargado (para no recargar igual)
    private long currentTrimEndMs = -1;

    // ── Prefetch de música del SIGUIENTE slide horizontal (baja latencia) ────────
    // Mientras ves un slide del carrusel, precargamos en PAUSA la pista del slide +1
    // en este player secundario (ya bufferada). Al llegar a ese slide, setMusic
    // detecta que la pista coincide con la prebuferada → INTERCAMBIA los players →
    // suena al instante, sin volver a descargar. Se limpia al hacer scroll VERTICAL
    // (clearMusicPrefetch) para no acumular música en memoria entre videos.
    private ExoPlayer musicPrefetchPlayer;
    private String prefetchMusicPath;        // ruta (sin firma) de la pista prebuferada
    private long prefetchTrimStartMs = -1;
    private long prefetchTrimEndMs = -1;
    // Mute global del feed. Guardamos los volúmenes "reales" para restaurarlos al
    // quitar el mute (setMusic los actualiza con los del video activo).
    private boolean muted = false;
    private float lastVideoVolume = 1.0f;
    private float lastMusicVolume = 0.8f;

    // Callback al plugin cuando un VIDEO falla al reproducir (típicamente 403 por
    // URL firmada vencida). El plugin lo reenvía al JS, que pide una URL fresca
    // (re-firma) y la reproduce con playUrl. position = índice de la página activa.
    interface ErrorCallback { void onVideoError(int position); }
    private ErrorCallback errorCallback;
    void setErrorCallback(ErrorCallback cb) { this.errorCallback = cb; }

    VideoPagerAdapter(Context context, List<String> urls) {
        this.context = context;
        this.urls = urls;
    }

    void setGlobalPaused(boolean paused) {
        globalPaused = paused;
        ExoPlayer act = active();
        if (act != null) act.setPlayWhenReady(!paused);
        // La música sigue al video.
        if (musicPlayer != null && currentMusicUrl != null) musicPlayer.setPlayWhenReady(!paused);
    }

    /**
     * Agrega videos al final del feed (paginación: al scrollear cerca del fondo el
     * JS trae más videos y los añade aquí). notifyItemRangeInserted mantiene el
     * ViewPager2 fluido sin reconstruir lo ya visible. Evita duplicados.
     */
    void appendUrls(List<String> more) {
        if (more == null || more.isEmpty()) return;
        int start = urls.size();
        int added = 0;
        for (String u : more) {
            if (u != null && !u.isEmpty() && !urls.contains(u)) {
                urls.add(u);
                added++;
            }
        }
        if (added > 0) notifyItemRangeInserted(start, added);
    }

    /**
     * REEMPLAZA toda la lista del feed y reinicia en la página 0. Lo llama el JS al
     * cambiar de tab ("Para ti" ↔ "Seguidos"): el feed es otro, así que liberamos los
     * players viejos, cargamos las URLs nuevas y volvemos arriba. Sin esto, el nativo
     * seguía mostrando los videos del tab anterior (appendUrls solo agrega al final).
     */
    void replaceUrls(ViewPager2 pager, List<String> newUrls) {
        if (newUrls == null) return;
        // Soltar TODOS los players (el contenido cambió por completo) y la música.
        for (ExoPlayer p : pool.values()) p.release();
        pool.clear();
        clearMusicPrefetch();
        if (musicPlayer != null) { musicPlayer.stop(); musicPlayer.clearMediaItems(); }
        currentMusicUrl = null;
        currentTrimStartMs = currentTrimEndMs = -1;
        currentPlayUrlPath = null;
        prefetchedPaths.clear();
        activePos = -1;

        urls.clear();
        for (String u : newUrls) if (u != null && !u.isEmpty()) urls.add(u);

        // CLAVE: RE-ASIGNAR el adapter en vez de notifyDataSetChanged. Con
        // notifyDataSetChanged el ViewPager2 a veces NO recalcula el nº de páginas
        // (quedaba mostrando 1 video sin poder scrollear hasta refrescar). Re-setear el
        // adapter fuerza un re-layout LIMPIO del RecyclerView interno → todas las páginas
        // disponibles de inmediato. Reusamos el mismo adapter (ya tiene las urls nuevas).
        if (pager != null) {
            pager.setAdapter(null);
            pager.setAdapter(this);
            pager.setCurrentItem(0, false);
            pager.post(() -> setActivePage(pager, 0));
        } else {
            notifyDataSetChanged();
        }
    }

    /** Silencia/activa TODO el feed (video + música) sin parar la reproducción. */
    void setMuted(boolean m) {
        muted = m;
        // Aplicar a todos los players del pool (activo + vecinos).
        for (ExoPlayer p : pool.values()) p.setVolume(m ? 0f : lastVideoVolume);
        if (musicPlayer != null) musicPlayer.setVolume(m ? 0f : lastMusicVolume);
    }

    // ── Corte de audio durante el SCROLL (vertical y horizontal) ────────────────
    // BUG que elimina: al arrastrar de un video a otro se oía un "feedback" del
    // audio (video + música) del video que dejabas, porque el cambio de player solo
    // ocurría en onPageSelected (tarde, al asentar). Aquí cortamos TODO el audio en
    // cuanto empieza el arrastre: ni el video activo ni la música suenan durante la
    // transición. Al asentar, setActivePage/applyNativeMusic reanudan el correcto.
    //
    // scrollPausing=true mientras se arrastra: bloquea cualquier intento de reanudar
    // (p.ej. setActivePage del vecino) hasta soltar → cero feedback, garantizado.
    private boolean scrollPausing = false;
    // Página activa al INICIAR el arrastre. Al soltar, si seguimos en la misma página
    // (no cambiaste de video) reanudamos su música directamente; si cambiaste, NO la
    // tocamos aquí: applyNativeMusic (vía pageChanged) cargará la del nuevo video. Así
    // evitamos reanudar por un instante la música VIEJA antes de que llegue la nueva.
    private int scrollStartPos = -1;

    void setScrollPausing(boolean pausing) {
        scrollPausing = pausing;
        if (pausing) {
            scrollStartPos = activePos;
            // Pausar VIDEO activo + TODOS los vecinos (por si alguno quedó sonando) y
            // la música. setPlayWhenReady(false) detiene el audio inmediatamente.
            for (ExoPlayer p : pool.values()) p.setPlayWhenReady(false);
            if (musicPlayer != null) musicPlayer.setPlayWhenReady(false);
            // Empezó el arrastre → AHORA sí adjuntar los frames de los vecinos a sus
            // PlayerViews, para que el usuario vea el video que viene subiendo/bajando
            // (scroll fluido). Hasta este momento estaban preparados pero SIN pintar,
            // por eso no asomaban al asentar en el video anterior.
            attachNeighbors();
        } else {
            // Soltó: reanudar el video activo (si el feed no está en pausa global). Los
            // vecinos siguen pausados.
            ExoPlayer act = active();
            if (act != null) act.setPlayWhenReady(!globalPaused);
            // Música: reanudar la que esté cargada para el video activo. Si CAMBIASTE de
            // página, el 'pageChanged' ya llamó setMusic con la música del NUEVO video (pero
            // con setPlayWhenReady(false) porque scrollPausing seguía true) → aquí, al llegar
            // a IDLE, la arrancamos. Sin esto, la música del nuevo video quedaba cargada pero
            // MUDA hasta que el usuario pausaba/reproducía a mano. currentMusicUrl==null si el
            // video activo no tiene pista → no suena nada (correcto).
            if (musicPlayer != null && currentMusicUrl != null) {
                musicPlayer.setPlayWhenReady(!globalPaused);
            }
            scrollStartPos = -1;
        }
    }

    boolean isScrollPausing() { return scrollPausing; }

    /**
     * Adjunta los players de los vecinos (activePos±1) a sus PlayerViews para que su
     * frame se pinte. Se llama al EMPEZAR a arrastrar → así el usuario ve el video que
     * viene mientras desliza, pero ese frame NO estaba pintado mientras el feed estaba
     * quieto (eso elimina el "pantallazo" que asomaba ~100ms tras asentar).
     */
    private void attachNeighbors() {
        if (pagerRef == null) return;
        ensurePlayerFor(pagerRef, activePos - 1, true);
        ensurePlayerFor(pagerRef, activePos + 1, true);
    }

    private ExoPlayer ensureMusicPlayer() {
        if (musicPlayer == null) {
            musicPlayer = new ExoPlayer.Builder(context).build();
            musicPlayer.setRepeatMode(Player.REPEAT_MODE_ONE); // loop de la música
            musicPlayer.addListener(new Player.Listener() {
                @Override public void onPlayerError(androidx.media3.common.PlaybackException e) {
                    android.util.Log.e("BuzzyMusic", "MUSIC PLAYER ERROR: " + e.getMessage(), e);
                }
            });
        }
        return musicPlayer;
    }

    /**
     * Configura la música del video activo (la llama el JS en pageChanged/playUrl).
     * url vacío/null = sin música. volOriginal baja el audio del VIDEO; volMusic sube
     * la música. trimStartMs/trimEndMs = RANGO recortado que el usuario eligió al
     * subir: la música suena SOLO en ese rango y loopea dentro de él (no la canción
     * entera). trimEndMs<=0 = sin recorte final (suena hasta el final del archivo).
     */
    void setMusic(String url, float volMusic, float volOriginal, long trimStartMs, long trimEndMs) {
        // Guardar volúmenes "reales" para restaurarlos al quitar el mute.
        lastVideoVolume = volOriginal;
        lastMusicVolume = volMusic;
        // Volumen del audio propio del video activo (se baja cuando hay música
        // encima). Si el feed está MUTEADO, 0.
        ExoPlayer act = active();
        if (act != null) act.setVolume(muted ? 0f : volOriginal);

        if (url == null || url.isEmpty()) {
            // Este video no tiene música: parar la del anterior (principal Y prefetch).
            if (musicPlayer != null) {
                musicPlayer.setPlayWhenReady(false);
                musicPlayer.stop();
                musicPlayer.clearMediaItems();
            }
            if (musicPrefetchPlayer != null) {
                musicPrefetchPlayer.setPlayWhenReady(false);
                musicPrefetchPlayer.stop();
            }
            currentMusicUrl = null;
            currentTrimStartMs = -1;
            currentTrimEndMs = -1;
            return;
        }

        long start = Math.max(0, trimStartMs);
        long end = trimEndMs;

        // Recargar solo si cambió la pista O el rango. Comparar por RUTA (sin la firma
        // ?expires=&sig=, que cambia en cada feed): con la URL completa, sameTrack era
        // SIEMPRE false → re-descargaba la música en cada slide → 429 del servidor.
        boolean sameTrack = pathOf(url).equals(pathOf(currentMusicUrl))
            && start == currentTrimStartMs && end == currentTrimEndMs;

        // ¿La pista que pedimos es justo la que PRE-BUFERAMOS para el siguiente slide?
        // Si sí, intercambiamos: el prefetch player (ya bufferado) pasa a ser el
        // principal → suena al instante, sin re-descargar. Latencia ~0.
        boolean usePrefetch = !sameTrack
            && musicPrefetchPlayer != null
            && pathOf(url).equals(prefetchMusicPath)
            && start == prefetchTrimStartMs && end == prefetchTrimEndMs;

        if (usePrefetch) {
            // Soltar el player de música viejo y promover el prefetch a principal.
            if (musicPlayer != null) musicPlayer.release();
            musicPlayer = musicPrefetchPlayer;
            musicPrefetchPlayer = null;
            prefetchMusicPath = null;
            prefetchTrimStartMs = prefetchTrimEndMs = -1;
            currentMusicUrl = url;
            currentTrimStartMs = start;
            currentTrimEndMs = end;
            musicPlayer.setVolume(muted ? 0f : volMusic);
            musicPlayer.setPlayWhenReady(!globalPaused && !scrollPausing);
            return;
        }

        ExoPlayer mp = ensureMusicPlayer();
        mp.setVolume(muted ? 0f : volMusic);

        if (!sameTrack) {
            currentMusicUrl = url;
            currentTrimStartMs = start;
            currentTrimEndMs = end;
            mp.setMediaSource(buildClippedSource(url, start, end));
            mp.prepare();
        }
        // No arrancar la música si el feed está pausado O si se está arrastrando
        // (scrollPausing): durante la transición no debe sonar NADA del audio.
        mp.setPlayWhenReady(!globalPaused && !scrollPausing);
    }

    /** Construye el MediaSource recortado [start,end] (ms) para una pista de música. */
    private MediaSource buildClippedSource(String url, long startMs, long endMs) {
        // Caché de disco (SimpleCache): la pista vista no se re-descarga al volver.
        MediaSource base = new ProgressiveMediaSource.Factory(
                VideoCache.cachedFactory(context))
                .createMediaSource(MediaItem.fromUri(url));
        if (endMs > startMs) {
            // RANGO exacto [start, end] en microsegundos. Loopea con REPEAT_MODE_ONE.
            return new ClippingMediaSource(base, startMs * 1000L, endMs * 1000L);
        }
        // Sin fin definido: recorta solo el inicio, suena hasta el final.
        return new ClippingMediaSource(
            base, startMs * 1000L, androidx.media3.common.C.TIME_END_OF_SOURCE);
    }

    /**
     * Pre-bufera EN PAUSA la pista del SIGUIENTE slide horizontal (baja latencia al
     * llegar). url vacío/null o pista ya prebuferada/sonando = no hace nada. La llama
     * el JS al cambiar de slide horizontal con la pista del slide +1.
     */
    void prefetchMusic(String url, long trimStartMs, long trimEndMs) {
        if (url == null || url.isEmpty()) return;
        long start = Math.max(0, trimStartMs);
        long end = trimEndMs;
        String path = pathOf(url);
        // Ya es la que suena, o ya la prebuferamos → nada que hacer.
        if (path.equals(pathOf(currentMusicUrl)) && start == currentTrimStartMs && end == currentTrimEndMs) return;
        if (path.equals(prefetchMusicPath) && start == prefetchTrimStartMs && end == prefetchTrimEndMs) return;
        // Recrear el prefetch player con la nueva pista (en pausa, solo buffer).
        if (musicPrefetchPlayer != null) musicPrefetchPlayer.release();
        musicPrefetchPlayer = new ExoPlayer.Builder(context).build();
        musicPrefetchPlayer.setRepeatMode(Player.REPEAT_MODE_ONE);
        musicPrefetchPlayer.setVolume(0f);                 // no debe sonar aún
        musicPrefetchPlayer.setMediaSource(buildClippedSource(url, start, end));
        musicPrefetchPlayer.prepare();                     // bufferea sin reproducir
        musicPrefetchPlayer.setPlayWhenReady(false);
        prefetchMusicPath = path;
        prefetchTrimStartMs = start;
        prefetchTrimEndMs = end;
    }

    /** Libera la música prebuferada (al hacer scroll VERTICAL: no acumular memoria). */
    void clearMusicPrefetch() {
        if (musicPrefetchPlayer != null) {
            musicPrefetchPlayer.release();
            musicPrefetchPlayer = null;
        }
        prefetchMusicPath = null;
        prefetchTrimStartMs = prefetchTrimEndMs = -1;
    }

    /**
     * LoadControl afinado para un FEED de clips cortos verticales (estilo TikTok):
     * - Arranque RÁPIDO: empezar a reproducir con poco buffer (1s) en vez de los ~2.5s
     *   por defecto → el video aparece antes al deslizar.
     * - Buffer acotado (15-30s): clips de <60s no necesitan buffers grandes; mantenerlo
     *   corto reduce memoria y presión de GC con varios players a la vez.
     * - Rebuffer rápido (2s): si se vacía, retomar con poco buffer (sin esperas largas).
     */
    private androidx.media3.exoplayer.LoadControl buildFeedLoadControl() {
        return new androidx.media3.exoplayer.DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                15_000,  // minBufferMs: buffer objetivo mínimo
                30_000,  // maxBufferMs: tope de buffer

                2_500,   // bufferForPlaybackMs: cuánto buffer para EMPEZAR. 1s era demasiado
                         // agresivo para un ARRANQUE EN FRÍO (perfil: el video tocado nunca
                         // se pre-calienta como vecino) → rebotaba READY↔BUFFERING los
                         // primeros segundos (el "frizado"). ~2.5s da margen suficiente. En
                         // el feed no se nota: los vecinos ya vienen buferados y satisfacen
                         // este umbral al instante.
                2_000)   // bufferForPlaybackAfterRebufferMs: para retomar tras un corte
            .setPrioritizeTimeOverSizeThresholds(true)
            .build();
    }

    private ExoPlayer buildPlayer() {
        // Caché de disco para el VIDEO + LoadControl afinado para feed (arranque
        // rápido, buffer corto y estable → menos memoria, sin rebuffer en clips cortos).
        ExoPlayer pl = new ExoPlayer.Builder(context)
            .setMediaSourceFactory(new androidx.media3.exoplayer.source.DefaultMediaSourceFactory(
                VideoCache.cachedFactory(context)))
            .setLoadControl(buildFeedLoadControl())
            .build();
        pl.setRepeatMode(Player.REPEAT_MODE_ONE);
        pl.addListener(new Player.Listener() {
            @Override public void onPlayerError(androidx.media3.common.PlaybackException e) {
                android.util.Log.e("BuzzyVideo", "PLAYER ERROR: " + e.getMessage(), e);
                // Solo nos importa el error del player ACTIVO (el que se está viendo).
                // Un 403 por firma vencida llega como SOURCE/HTTP error → avisamos al JS
                // para que re-firme la URL y la vuelva a reproducir (playUrl).
                if (errorCallback != null && pool.get(activePos) == pl) {
                    errorCallback.onVideoError(activePos);
                }
            }
            @Override public void onPlaybackStateChanged(int state) {
                // Solo loguear el player ACTIVO: el pantallazo NEGRO vertical suele ser
                // el player activo cayendo a BUFFERING (2) tras READY (3) → el shutter
                // negro asoma un instante. Registrar la transición para verificarlo.
                if (pool.get(activePos) == pl) {
                    String s = state == Player.STATE_IDLE ? "IDLE"
                            : state == Player.STATE_BUFFERING ? "BUFFERING"
                            : state == Player.STATE_READY ? "READY"
                            : state == Player.STATE_ENDED ? "ENDED" : String.valueOf(state);
                    android.util.Log.d("BuzzyBlk", "STATE=" + s + " activePos=" + activePos + " (ACTIVE) playWhenReady=" + pl.getPlayWhenReady());
                }
            }
        });
        return pl;
    }

    /** El player ACTIVO (el de la página activePos). null si aún no existe. */
    private ExoPlayer active() { return pool.get(activePos); }

    /** El PlayerView del holder ACTIVO (para manipular su superficie/shutter). null si no existe. */
    private PlayerView playerViewForActive() {
        if (pagerRef == null) return null;
        View child = pagerRef.getChildAt(0);
        if (!(child instanceof RecyclerView)) return null;
        RecyclerView.ViewHolder vh = ((RecyclerView) child).findViewHolderForAdapterPosition(activePos);
        return (vh instanceof PageHolder) ? ((PageHolder) vh).playerView : null;
    }

    // Pool pequeño de hilos para el prefetch parcial a caché (no bloquea la UI).
    private final java.util.concurrent.ExecutorService prefetchExec =
            java.util.concurrent.Executors.newFixedThreadPool(2);
    // Rutas ya prefetcheadas (sin firma) para no repetir descargas del mismo archivo.
    private final java.util.Set<String> prefetchedPaths =
            java.util.Collections.synchronizedSet(new java.util.HashSet<>());

    /**
     * Descarga el INICIO (~512KB) del video en `pos` a la caché de disco, SIN crear un
     * ExoPlayer/decoder. Para que un swipe rápido de 2 videos arranque desde disco.
     * Best-effort: si falla (red/cancelado), se ignora — el player normal lo cargará.
     */
    private void prefetchToCache(int pos) {
        if (pos < 0 || pos >= urls.size()) return;
        final String url = urls.get(pos);
        if (url == null || url.isEmpty()) return;
        final String key = pathOf(url);
        if (!prefetchedPaths.add(key)) return; // ya prefetcheado
        prefetchExec.execute(() -> {
            try {
                androidx.media3.datasource.DataSpec spec =
                    new androidx.media3.datasource.DataSpec.Builder()
                        .setUri(android.net.Uri.parse(url))
                        .setLength(512L * 1024)   // solo el inicio (arranque)
                        .build();
                androidx.media3.datasource.cache.CacheDataSource ds =
                    (androidx.media3.datasource.cache.CacheDataSource)
                        VideoCache.cachedFactory(context).createDataSource();
                new androidx.media3.datasource.cache.CacheWriter(ds, spec, null, null).cache();
            } catch (Exception e) {
                // Best-effort: si no se pudo prefetchear, el player normal lo descargará.
                prefetchedPaths.remove(key);
            }
        });
    }

    /**
     * Garantiza un player para `pos`. Si `attach` es true, además lo PEGA a su PlayerView
     * (su 1er frame se renderiza en pantalla). Si es false, solo prepara el decoder/buffer
     * (frame listo en memoria) PERO sin adjuntarlo → su frame NO se pinta todavía.
     *
     * CLAVE anti-"pantallazo": los VECINOS se preparan con attach=false. Así su decoder
     * está listo (arranque instantáneo al deslizar) pero su 1er frame, que termina de
     * decodificarse ~100ms DESPUÉS de asentar en otro video, NO se pinta en su PlayerView
     * → no puede "asomar" por el borde. Solo se adjuntan (attach=true) cuando empieza el
     * arrastre hacia ellos (attachNeighbors) o al volverse activos.
     */
    private ExoPlayer ensurePlayerFor(ViewPager2 pager, int pos, boolean attach) {
        if (pos < 0 || pos >= urls.size()) return null;
        ExoPlayer p = pool.get(pos);
        if (p == null) {
            try {
                p = buildPlayer();
                p.setMediaItem(MediaItem.fromUri(urls.get(pos)));
                p.prepare();
                p.setPlayWhenReady(false);  // vecino: frame listo, sin sonar
                pool.put(pos, p);
            } catch (Exception ex) {
                // Sin decoders disponibles u OOM → no crashear; seguir sin este vecino.
                android.util.Log.e("BuzzyVideo", "ensurePlayerFor("+pos+") error", ex);
                if (p != null) { try { p.release(); } catch (Exception ignored) {} }
                return null;
            }
        }
        if (!attach) return p;  // solo preparar decoder; NO pintar su frame aún
        // Adjuntar el player a su PlayerView → su frame se renderiza. Si el ViewHolder
        // aún no existe, reintentar en el próximo frame.
        RecyclerView rv = (RecyclerView) pager.getChildAt(0);
        RecyclerView.ViewHolder vh = rv.findViewHolderForAdapterPosition(pos);
        if (vh instanceof PageHolder) {
            PlayerView pv = ((PageHolder) vh).playerView;
            if (pv.getPlayer() != p) pv.setPlayer(p);
        } else {
            final ExoPlayer fp = p;
            pager.post(() -> {
                if (fp != pool.get(pos)) return; // ya reciclado
                RecyclerView.ViewHolder vh2 = rv.findViewHolderForAdapterPosition(pos);
                if (vh2 instanceof PageHolder) {
                    PlayerView pv2 = ((PageHolder) vh2).playerView;
                    if (pv2.getPlayer() != fp) pv2.setPlayer(fp);
                }
            });
        }
        return p;
    }

    /**
     * Hace activa la página `position`: mantiene un POOL de players para
     * [position-1, position, position+1] (cada uno con su frame visible), reproduce
     * SOLO el activo, y libera los players fuera de esa ventana.
     */
    void setActivePage(ViewPager2 pager, int position) {
        if (position < 0 || position >= urls.size()) return;
        pagerRef = pager;

        RecyclerView rv = (RecyclerView) pager.getChildAt(0);
        if (rv == null || !(rv.findViewHolderForAdapterPosition(position) instanceof PageHolder)) {
            pager.post(() -> setActivePage(pager, position));
            return;
        }

        int prevActive = activePos;
        activePos = position;

        // Cambió la página vertical → el player activo ahora reproduce el video del
        // feed (no el de un slide horizontal). Olvidar la ruta de playUrl para que un
        // futuro slide horizontal del nuevo video sí se cargue (no lo bloquee el guard).
        if (prevActive != position) currentPlayUrlPath = null;

        // ── 1) ACTIVO: reproducir ya (su player/frame ya están en el pool) ──────
        if (prevActive != position) {
            ExoPlayer old = pool.get(prevActive);
            if (old != null) old.setPlayWhenReady(false);
        }
        ExoPlayer act = pool.get(position);
        if (act == null) act = ensurePlayerFor(pager, position, true);
        else ensurePlayerFor(pager, position, true); // asegurar que el ACTIVO esté adjunto
        // NO reanudar si todavía estamos arrastrando/asentando (scrollPausing): el
        // audio debe permanecer en silencio hasta SOLTAR. Al llegar a IDLE, el plugin
        // llama setScrollPausing(false) que reanuda el video activo correcto. Sin esto,
        // onPageSelected (que llega durante el settling) reanudaría el audio antes de
        // tiempo → volvería el "feedback" del video viejo durante la transición.
        if (act != null && !scrollPausing) act.setPlayWhenReady(!globalPaused);

        // ── 2) VECINOS: preparar su DECODER (attach=false → NO adjuntar su frame a la
        // PlayerView todavía). CONFIRMADO por logcat: el 1er frame del vecino se decodifica
        // ~600ms tras asentar; si su PlayerView está adjunta, ese frame SE PINTA y asoma
        // (= el "pantallazo"). Con attach=false su decoder queda listo (arranque instantáneo)
        // pero su frame NO se renderiza hasta que se arrastre hacia él (attachNeighbors).
        ensurePlayerFor(pager, position - 1, false);
        ensurePlayerFor(pager, position + 1, false);

        // ── 2b) PREFETCH PARCIAL a caché de los videos a DISTANCIA 2 (sin decoder).
        // No creamos player (no gastamos decoders de hardware: riesgoso en gama baja);
        // solo descargamos el INICIO del archivo a la caché de disco. Así, un swipe
        // rápido de 2 videos seguidos arranca desde disco (instantáneo) sin esperar red.
        prefetchToCache(position + 2);
        prefetchToCache(position - 2);

        // ── 3) LIBERAR players fuera de ventana: DIFERIDO (esto SÍ era lo costoso
        // que causaba el micro-freno). Se hace tras la animación, sin afectar el frame.
        final int pos = position;
        pager.postDelayed(() -> {
            if (activePos != pos) return; // el usuario ya siguió scrolleando
            try {
                java.util.Iterator<java.util.Map.Entry<Integer, ExoPlayer>> it = pool.entrySet().iterator();
                while (it.hasNext()) {
                    java.util.Map.Entry<Integer, ExoPlayer> e = it.next();
                    int k = e.getKey();
                    if (k < pos - 1 || k > pos + 1) {
                        ExoPlayer pl = e.getValue();
                        RecyclerView.ViewHolder vh = rv.findViewHolderForAdapterPosition(k);
                        if (vh instanceof PageHolder) {
                            PlayerView pv = ((PageHolder) vh).playerView;
                            if (pv.getPlayer() == pl) pv.setPlayer(null);
                        }
                        pl.release();
                        it.remove();
                    }
                }
            } catch (Exception ex) {
                android.util.Log.e("BuzzyVideo", "setActivePage release error", ex);
            }
        }, 350);
    }

    void setPaused(ViewPager2 pager, int position, boolean paused) {
        globalPaused = paused;
        ExoPlayer act = active();
        if (act != null) act.setPlayWhenReady(!paused);
        // La música se pausa/reanuda junto al video.
        if (musicPlayer != null && currentMusicUrl != null) musicPlayer.setPlayWhenReady(!paused);
    }

    /**
     * Reproduce una URL ARBITRARIA en el player ACTIVO (carrusel horizontal: videos
     * del mismo usuario que NO están en el array vertical). Solo cambia su mediaItem.
     */
    // Ruta (sin query de firma) del último video cargado por playUrl. Evita re-preparar
    // —y re-descargar— el MISMO video cuando el JS llama playUrl repetidamente (la URL
    // cambia solo en ?expires=&sig=). Esa re-descarga en bucle disparaba 429 del server.
    private String currentPlayUrlPath;

    /**
     * Recarga el video ACTIVO con una URL fresca. Solo se usa para la RE-FIRMA: cuando la
     * URL firmada del video venció (403) y el JS obtuvo una nueva, la reproduce aquí. Es la
     * MISMA ruta de archivo (solo cambia ?expires=&sig=), así que el player recarga el
     * mismo video con la firma nueva. No se usa para carrusel (eliminado).
     */
    void playUrl(String url) {
        if (url == null || url.isEmpty()) return;
        ExoPlayer act = pool.get(activePos);
        if (act == null) return;
        scrollPausing = false;
        currentPlayUrlPath = pathOf(url);
        // Actualizar también la URL en la lista para que futuros re-attach usen la firma nueva.
        if (activePos >= 0 && activePos < urls.size()) urls.set(activePos, url);
        act.setMediaItem(MediaItem.fromUri(url));
        act.prepare();
        act.setPlayWhenReady(!globalPaused);
    }

    /** Ruta del archivo sin el query de firma (?expires=&sig=), para comparar igualdad. */
    private static String pathOf(String url) {
        if (url == null) return "";
        int q = url.indexOf('?');
        return q >= 0 ? url.substring(0, q) : url;
    }

    /** Posición actual del video en ms (para la barra de progreso/métricas). */
    long getPositionMs() {
        ExoPlayer act = active();
        return act != null ? Math.max(0, act.getCurrentPosition()) : 0;
    }

    /** Duración del video en ms (puede ser 0 si aún no se conoce). */
    long getDurationMs() {
        ExoPlayer act = active();
        if (act == null) return 0;
        long d = act.getDuration();
        return d > 0 ? d : 0; // C.TIME_UNSET viene negativo
    }

    /** ¿El video activo está reproduciéndose ahora mismo? */
    boolean isPlaying() {
        ExoPlayer act = active();
        return act != null && act.isPlaying();
    }

    void releaseAll() {
        for (ExoPlayer p : pool.values()) p.release();
        pool.clear();
        if (musicPlayer != null) { musicPlayer.release(); musicPlayer = null; }
        clearMusicPrefetch();
        prefetchExec.shutdownNow();
        prefetchedPaths.clear();
        currentMusicUrl = null;
    }

    @NonNull
    @Override
    public PageHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_video, parent, false);
        return new PageHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull PageHolder holder, int position) {
        // CRÍTICO: el RecyclerView REUSA esta PlayerView para un nuevo `position`. Si
        // no la limpiamos, conserva el frame del VIDEO VIEJO → "el frame de un video
        // sale en otro". PRIMERO limpiamos (sin frame viejo), LUEGO pegamos el player
        // correcto de ESA posición (creándolo si falta) → el frame que se ve SIEMPRE
        // corresponde al video de esta página.
        holder.playerView.setPlayer(null);
        if (position >= 0 && position < urls.size() && pagerRef != null) {
            // Preparar el decoder; adjuntar su frame SOLO si es el activo (los vecinos no
            // se pintan hasta arrastrar hacia ellos → no asoma el pantallazo).
            ensurePlayerFor(pagerRef, position, position == activePos);
        }
    }

    @Override
    public void onViewRecycled(@NonNull PageHolder holder) {
        super.onViewRecycled(holder);
        // Al reciclar, soltar el player de esta vista para que no arrastre el frame
        // viejo a su próximo uso.
        holder.playerView.setPlayer(null);
    }

    @Override
    public int getItemCount() { return urls.size(); }

    static class PageHolder extends RecyclerView.ViewHolder {
        final PlayerView playerView;
        PageHolder(@NonNull View itemView) {
            super(itemView);
            playerView = itemView.findViewById(R.id.player_view);
            playerView.setUseController(false);
            // SIN pestañazo negro al recambiar el media (carrusel horizontal: playUrl
            // hace setMediaItem+prepare → el PlayerView, por defecto, muestra su
            // "shutter" NEGRO mientras bufferea el nuevo video). Lo dejamos
            // TRANSPARENTE y mantenemos el último frame en el reset → durante el
            // prepare no se ve negro; el thumbnail del WebView encima cubre la
            // transición y al llegar el 1er frame nuevo se revela limpio.
            playerView.setShutterBackgroundColor(android.graphics.Color.TRANSPARENT);
            playerView.setKeepContentOnPlayerReset(true);
        }
    }
}
