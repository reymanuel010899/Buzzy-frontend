package com.buzzy.app;

import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.annotation.OptIn;
import androidx.media3.common.util.UnstableApi;
import androidx.viewpager2.widget.ViewPager2;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

/**
 * Feed de video NATIVO con SCROLL nativo (ViewPager2 + ExoPlayer), renderizado
 * DETRÁS del WebView transparente. El nativo maneja scroll Y video juntos (como
 * TikTok) → sincronización perfecta, sin lag. La UI HTML (botones, header, nav)
 * queda ENCIMA, intacta.
 *
 * Comunicación:
 *   show({ videoUrls })  → inserta el ViewPager2 detrás y arranca en la página 0
 *   hide()               → quita el feed y restaura el WebView
 *   setPaused({paused})  → pausa/reanuda el video actual
 *   EVENTO "pageChanged" {index} → el nativo AVISA al JS cuando el swipe cambia de
 *                                  video, para que la UI actualice los botones.
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "BuzzyVideoFeed")
public class VideoFeedPlugin extends Plugin {

    private final List<String> urls = new ArrayList<>();
    private ViewPager2 pager;
    private View pagerRoot;
    private VideoPagerAdapter adapter;
    // Márgenes (px) para que el video NO quede detrás del navbar/nav inferior. El JS
    // los pasa con setInsets (conoce la altura real del header). Se aplican al crear
    // el pager y se pueden cambiar en caliente.
    private int pendingTopInsetPx = 0;
    private int pendingBottomInsetPx = 0;
    // Cuando hay un modal HTML encima (comentarios, gifts…), bloqueamos el scroll
    // nativo: el WebView NO reenvía swipes al ViewPager2 → el feed no se mueve detrás.
    private boolean scrollLocked = false;
    // El feed nativo se inserta INVISIBLE y solo se revela cuando el WebView ya pintó
    // su chrome (navbar/historias/tabs), para que video y UI aparezcan a la vez al
    // volver a la app. setVisible() respeta esta bandera: no muestra el pager hasta
    // que el JS haya llamado reveal().
    private boolean revealed = false;

    // ── Emisor de PROGRESO (Fase 3.4) ───────────────────────────────────────────
    // Cada ~300ms emite "progress" {position,duration} del video activo → el JS
    // alimenta la barra de progreso y dispara vistas/métricas por tiempo. Solo
    // corre cuando el feed está visible y reproduciendo (no gasta batería oculto).
    private final android.os.Handler progressHandler =
            new android.os.Handler(android.os.Looper.getMainLooper());
    private boolean progressRunning = false;
    private final Runnable progressTick = new Runnable() {
        @Override public void run() {
            if (adapter != null && adapter.isPlaying()) {
                JSObject d = new JSObject();
                d.put("index", pager != null ? pager.getCurrentItem() : 0);
                d.put("position", adapter.getPositionMs());
                d.put("duration", adapter.getDurationMs());
                notifyListeners("progress", d);
            }
            if (progressRunning) progressHandler.postDelayed(this, 300);
        }
    };

    private void startProgress() {
        if (progressRunning) return;
        progressRunning = true;
        progressHandler.postDelayed(progressTick, 300);
    }

    private void stopProgress() {
        progressRunning = false;
        progressHandler.removeCallbacks(progressTick);
    }

    /** Inserta el ViewPager2 nativo detrás del WebView y arranca en la página 0. */
    @PluginMethod
    public void show(PluginCall call) {
        JSArray arr = call.getArray("videoUrls");
        urls.clear();
        if (arr != null) {
            try {
                for (Object o : arr.toList()) if (o != null) urls.add(o.toString());
            } catch (JSONException e) {
                call.reject("videoUrls inválido", e);
                return;
            }
        }
        if (urls.isEmpty()) { call.reject("No se pasaron videoUrls"); return; }

        getActivity().runOnUiThread(() -> {
            WebView web = getBridge().getWebView();
            ViewGroup parent = (ViewGroup) web.getParent();

            // WebView transparente (toda la cadena de padres + ventana) para ver el
            // ViewPager2/ExoPlayer detrás. Sin esto el WebView pinta opaco y tapa todo.
            web.setBackgroundColor(Color.TRANSPARENT);
            web.setBackground(null);
            ViewGroup p = parent;
            while (p != null) {
                p.setBackgroundColor(Color.TRANSPARENT);
                if (p.getParent() instanceof ViewGroup) p = (ViewGroup) p.getParent();
                else break;
            }
            getActivity().getWindow().setBackgroundDrawableResource(android.R.color.transparent);

            if (pagerRoot == null) {
                View root = getActivity().getLayoutInflater()
                        .inflate(R.layout.video_feed_pager, parent, false);
                pager = root.findViewById(R.id.video_pager);
                pager.setOrientation(ViewPager2.ORIENTATION_VERTICAL);
                // Mantener creados los ViewHolders vecinos (arriba/abajo) → sus
                // PlayerView/surface existen ANTES de arrastrar, así el frame de
                // precarga se ve desde el inicio del gesto (no tarde).
                pager.setOffscreenPageLimit(1);

                adapter = new VideoPagerAdapter(getContext(), urls);
                // Un video que falla al reproducir (típicamente 403 por URL firmada
                // vencida) → avisar al JS para que re-firme y reproduzca de nuevo.
                adapter.setErrorCallback(position -> {
                    JSObject d = new JSObject();
                    d.put("index", position);
                    notifyListeners("playerError", d);
                });
                // El player activo pintó su primer frame (tras playUrl en un cambio de
                // slide horizontal) → el JS desvanece el thumbnail recién ahora, sin
                // mostrar el frame del slide vecino mientras prepare() bufferea.
                adapter.setFrameCallback(position -> {
                    JSObject d = new JSObject();
                    d.put("index", position);
                    notifyListeners("frameReady", d);
                });
                pager.setAdapter(adapter);
                // Reproducir la página visible; pausar las demás. Y avisar al JS.
                pager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
                    @Override public void onPageSelected(int position) {
                        adapter.setActivePage(pager, position);
                        JSObject data = new JSObject();
                        data.put("index", position);
                        notifyListeners("pageChanged", data);
                    }
                    @Override public void onPageScrollStateChanged(int state) {
                        // DRAGGING(1)/SETTLING(2) = el usuario está moviendo el feed →
                        // avisamos al JS para que OCULTE los botones/overlays del HTML
                        // (no mostrar data del video viejo durante la transición).
                        // IDLE(0) = quieto en una página → mostrar de nuevo.
                        boolean scrolling = state != ViewPager2.SCROLL_STATE_IDLE;
                        // CORTE DE AUDIO: en cuanto empieza el arrastre, callar video +
                        // música del video que se deja (cero "feedback" del audio viejo).
                        // Al asentar (IDLE), reanudar el video activo correcto.
                        if (adapter != null) adapter.setScrollPausing(scrolling);
                        JSObject d = new JSObject();
                        d.put("scrolling", scrolling);
                        notifyListeners("scrollState", d);
                    }
                });

                // MarginLayoutParams para poder BAJAR el video debajo del navbar (y
                // subirlo sobre el nav inferior) → el avatar del autor no queda tapado.
                // El JS pasa los márgenes exactos vía setInsets (sabe la altura real).
                ViewGroup.MarginLayoutParams lp = new ViewGroup.MarginLayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT);
                lp.topMargin = pendingTopInsetPx;
                lp.bottomMargin = pendingBottomInsetPx;
                // ARRANQUE SIN "POP" DESCOORDINADO: insertamos el feed INVISIBLE. El
                // ViewPager2/ExoPlayer queda montado y precargando, pero NO se pinta
                // todavía. Así el video nativo no aparece ANTES que el chrome del WebView
                // (navbar, historias, tabs) al volver a la app. El JS llama reveal()
                // cuando React ya pintó su capa → ambos aparecen JUNTOS.
                root.setVisibility(View.INVISIBLE);
                revealed = false;
                parent.addView(root, 0, lp);
                pagerRoot = root;
                web.bringToFront();

                // ── Reenvío de gestos: el WebView está ENCIMA y se traga los toques,
                // por eso el ViewPager2 detrás no recibía el swipe (no scrolleaba).
                // Aquí: si el dedo se mueve verticalmente (swipe) reenviamos el
                // MotionEvent al ViewPager2 para que scrollee el video; si es un tap
                // (botón) lo dejamos al WebView (return false → lo maneja el HTML).
                final float[] down = new float[2];
                final boolean[] forwarding = { false };
                // Dirección del gesto, DECIDIDA UNA SOLA VEZ por gesto y bloqueada:
                // 0=indeciso, 1=vertical (→ ViewPager2), 2=horizontal (→ WebView/carrusel).
                // Sin este lock, un gesto que empieza horizontal (carrusel) y curva a
                // vertical activaba el reenvío al pager A MITAD → el carrusel y el feed
                // vertical se movían A LA VEZ ("se arrastran 2 al mismo tiempo").
                final int[] gestureDir = { 0 };
                final int touchSlop = android.view.ViewConfiguration.get(getContext()).getScaledTouchSlop();
                web.setOnTouchListener((v, ev) -> {
                    // El listener queda PEGADO al WebView y sobrevive a hide() (que pone
                    // pager=null). Si tocas la pantalla tras destruir el feed, pager sería
                    // null → NPE en getCurrentItem()/dispatchTouchEvent() = la app se cierra
                    // forzosamente. Si no hay pager, dejar el toque al WebView (return false).
                    if (pager == null) return false;
                    // Modal HTML encima → no tocar el feed nativo (deja todo al WebView).
                    if (scrollLocked) return false;
                    switch (ev.getActionMasked()) {
                        case android.view.MotionEvent.ACTION_DOWN:
                            down[0] = ev.getX(); down[1] = ev.getY();
                            forwarding[0] = false;
                            gestureDir[0] = 0; // dirección aún indecisa
                            break;
                        case android.view.MotionEvent.ACTION_MOVE:
                            // Decidir la dirección UNA sola vez, en cuanto el dedo supere el
                            // slop. La decisión se MANTIENE todo el gesto (lock).
                            if (gestureDir[0] == 0) {
                                float rawDx = ev.getX() - down[0];
                                float rawDy = ev.getY() - down[1];
                                float dx = Math.abs(rawDx);
                                float dy = Math.abs(rawDy);
                                if (dx > touchSlop || dy > touchSlop) {
                                    // Margen anti-diagonal: para reenviar al pager (vertical)
                                    // exigir que sea CLARAMENTE vertical (dy > dx*1.2). Si es
                                    // horizontal o diagonal, es del carrusel → WebView.
                                    boolean clearlyVertical = dy > dx * 1.2f;
                                    // EXCEPCIÓN: en la PÁGINA 0, arrastre hacia ABAJO no va al
                                    // pager (no hay anterior) → WebView para el pull-to-refresh.
                                    boolean pullToRefresh = pager.getCurrentItem() == 0 && rawDy > 0;
                                    if (clearlyVertical && !pullToRefresh) {
                                        gestureDir[0] = 1; // vertical → ViewPager2
                                        forwarding[0] = true;
                                        android.view.MotionEvent downEv = android.view.MotionEvent.obtain(
                                            ev.getDownTime(), ev.getEventTime(),
                                            android.view.MotionEvent.ACTION_DOWN, down[0], down[1], 0);
                                        pager.dispatchTouchEvent(downEv);
                                        downEv.recycle();
                                    } else {
                                        gestureDir[0] = 2; // horizontal → WebView/carrusel
                                    }
                                }
                            }
                            break;
                    }
                    if (forwarding[0]) {
                        pager.dispatchTouchEvent(ev);
                        return true;
                    }
                    return false;
                });

                // Arrancar el primero cuando el pager esté listo.
                pager.post(() -> adapter.setActivePage(pager, 0));
                startProgress();
            }
            call.resolve();
        });
    }

    /**
     * Agrega más videos al final del feed nativo (paginación infinita). El JS lo
     * llama cuando trae la siguiente página al acercarse al fondo del feed.
     */
    @PluginMethod
    public void appendUrls(PluginCall call) {
        JSArray arr = call.getArray("videoUrls");
        final List<String> more = new ArrayList<>();
        if (arr != null) {
            try {
                for (Object o : arr.toList()) if (o != null) more.add(o.toString());
            } catch (JSONException e) {
                call.reject("videoUrls inválido", e);
                return;
            }
        }
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.appendUrls(more);
            call.resolve();
        });
    }

    /**
     * REEMPLAZA toda la lista del feed nativo y reinicia en la página 0. El JS lo
     * llama al cambiar de tab ("Para ti" ↔ "Seguidos"): el contenido es otro.
     */
    @PluginMethod
    public void replaceUrls(PluginCall call) {
        JSArray arr = call.getArray("videoUrls");
        final List<String> newUrls = new ArrayList<>();
        if (arr != null) {
            try {
                for (Object o : arr.toList()) if (o != null) newUrls.add(o.toString());
            } catch (JSONException e) {
                call.reject("videoUrls inválido", e);
                return;
            }
        }
        getActivity().runOnUiThread(() -> {
            if (adapter != null && pager != null) adapter.replaceUrls(pager, newUrls);
            call.resolve();
        });
    }

    /**
     * Habilita/bloquea el SCROLL nativo del feed. Bloquear cuando hay un modal HTML
     * encima (comentarios, gifts) para que el feed no se mueva detrás del modal.
     */
    @PluginMethod
    public void setScrollEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);
        getActivity().runOnUiThread(() -> {
            scrollLocked = !Boolean.TRUE.equals(enabled);
            if (pager != null) pager.setUserInputEnabled(!scrollLocked);
            call.resolve();
        });
    }

    /**
     * Corta el audio (video + música) durante un arrastre del CARRUSEL HORIZONTAL.
     * El scroll vertical lo hace solo (onPageScrollStateChanged); el horizontal lo
     * maneja el WebView, así que el JS avisa: pausing=true al empezar a arrastrar de
     * lado, false al soltar/asentar. Mismo corte de "feedback" que en el vertical.
     */
    @PluginMethod
    public void setScrollPausing(PluginCall call) {
        Boolean pausing = call.getBoolean("pausing", false);
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.setScrollPausing(Boolean.TRUE.equals(pausing));
            call.resolve();
        });
    }

    /** Pausa/reanuda el video de la página actual. */
    @PluginMethod
    public void setPaused(PluginCall call) {
        Boolean paused = call.getBoolean("paused", true);
        getActivity().runOnUiThread(() -> {
            if (adapter != null && pager != null) {
                adapter.setPaused(pager, pager.getCurrentItem(), Boolean.TRUE.equals(paused));
            }
            call.resolve();
        });
    }

    /** Silencia/activa el feed nativo (video + música). */
    @PluginMethod
    public void setMuted(PluginCall call) {
        Boolean muted = call.getBoolean("muted", false);
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.setMuted(Boolean.TRUE.equals(muted));
            call.resolve();
        });
    }

    /**
     * Muestra/oculta el feed nativo SIN destruirlo (al salir a perfil/chat/modal).
     * Oculto: GONE + pausa el video. Visible: VISIBLE + reanuda (si no está en
     * candado/pausa manual, eso lo controla el JS aparte con setPaused).
     */
    @PluginMethod
    public void setVisible(PluginCall call) {
        Boolean visible = call.getBoolean("visible", true);
        boolean show = Boolean.TRUE.equals(visible);
        getActivity().runOnUiThread(() -> {
            if (pagerRoot != null) {
                // No revelar el feed por la puerta de atrás: si aún no se llamó reveal()
                // (chrome del WebView todavía sin pintar), mantenerlo oculto aunque pidan
                // visible=true. Cuando reveal() llegue, se mostrará coordinado.
                pagerRoot.setVisibility((show && revealed) ? View.VISIBLE : View.GONE);
            }
            // Al ocultar SIEMPRE pausamos (no debe sonar en otra pantalla). Al
            // mostrar NO reanudamos aquí: el JS decide con setPaused según el candado.
            if (!show && adapter != null && pager != null) {
                adapter.setPaused(pager, pager.getCurrentItem(), true);
                stopProgress();          // oculto → no gastar batería emitiendo progreso
            } else if (show) {
                startProgress();         // visible → reanudar emisión
            }
            call.resolve();
        });
    }

    /**
     * REVELA el feed nativo (insertado INVISIBLE en show()). El JS lo llama una vez
     * que React ya pintó su chrome (navbar/historias/tabs) — así el video nativo y la
     * UI del WebView aparecen JUNTOS al volver a la app, no uno antes que el otro.
     * Idempotente: llamarlo varias veces no hace daño.
     */
    @PluginMethod
    public void reveal(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            revealed = true;
            if (pagerRoot != null) pagerRoot.setVisibility(View.VISIBLE);
            call.resolve();
        });
    }

    /**
     * Define los márgenes (en px CSS) para que el video nativo NO quede detrás del
     * navbar (top) ni del nav inferior (bottom). El JS pasa la altura real medida.
     */
    @PluginMethod
    public void setInsets(PluginCall call) {
        double density = getActivity().getResources().getDisplayMetrics().density;
        int topPx = (int) (call.getDouble("top", 0.0) * density);
        int bottomPx = (int) (call.getDouble("bottom", 0.0) * density);
        getActivity().runOnUiThread(() -> {
            pendingTopInsetPx = topPx;
            pendingBottomInsetPx = bottomPx;
            if (pagerRoot != null && pagerRoot.getLayoutParams() instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams mlp =
                        (ViewGroup.MarginLayoutParams) pagerRoot.getLayoutParams();
                mlp.topMargin = topPx;
                mlp.bottomMargin = bottomPx;
                pagerRoot.setLayoutParams(mlp);
            }
            call.resolve();
        });
    }

    /**
     * Configura la música NATIVA del video activo (segundo ExoPlayer). El JS la
     * llama en pageChanged/playUrl con la pista del video. url vacío = sin música.
     */
    @PluginMethod
    public void setMusic(PluginCall call) {
        String url = call.getString("url", "");
        Float volMusic = call.getFloat("volumeMusic", 0.8f);
        Float volOriginal = call.getFloat("volumeOriginal", 1.0f);
        // trim viene en SEGUNDOS desde el JS → a milisegundos para ExoPlayer.
        Double trimStartSec = call.getDouble("trimStart", 0.0);
        Double trimEndSec = call.getDouble("trimEnd", 0.0);
        long trimStartMs = (long) (trimStartSec * 1000.0);
        long trimEndMs = (long) (trimEndSec * 1000.0); // 0 = sin recorte final
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.setMusic(url, volMusic, volOriginal, trimStartMs, trimEndMs);
            call.resolve();
        });
    }

    /**
     * Pre-bufera EN PAUSA la música del SIGUIENTE slide horizontal → al llegar suena
     * al instante (baja latencia). url vacío = no hace nada. trim en segundos.
     */
    @PluginMethod
    public void prefetchMusic(PluginCall call) {
        String url = call.getString("url", "");
        long trimStartMs = (long) (call.getDouble("trimStart", 0.0) * 1000.0);
        long trimEndMs = (long) (call.getDouble("trimEnd", 0.0) * 1000.0);
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.prefetchMusic(url, trimStartMs, trimEndMs);
            call.resolve();
        });
    }

    /**
     * Libera la música prebuferada del carrusel horizontal (al hacer scroll VERTICAL:
     * no acumular pistas en memoria entre videos del feed).
     */
    @PluginMethod
    public void clearMusicPrefetch(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.clearMusicPrefetch();
            call.resolve();
        });
    }

    /**
     * Reproduce una URL arbitraria en el player actual (carrusel horizontal: videos
     * del mismo usuario que no están en el array vertical). El JS lo llama cuando el
     * carrusel cambia de slide horizontal.
     */
    @PluginMethod
    public void playUrl(PluginCall call) {
        String url = call.getString("url");
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.playUrl(url);
            call.resolve();
        });
    }

    /**
     * PRE-PREPARA un slide horizontal vecino (crea su player con el frame decodificado,
     * pausado) para que al deslizar hacia él el cambio sea INSTANTÁNEO (sin buffering),
     * igual que un vecino del feed vertical. El JS lo llama para el slide +1 y -1.
     */
    @PluginMethod
    public void prefetchHorizontalSlide(PluginCall call) {
        String url = call.getString("url");
        getActivity().runOnUiThread(() -> {
            if (adapter != null) adapter.prefetchHorizontalSlide(url);
            call.resolve();
        });
    }

    /** Mueve el pager a un índice (p.ej. para sincronizar desde el JS si hiciera falta). */
    @PluginMethod
    public void setActive(PluginCall call) {
        Integer index = call.getInt("index");
        if (index == null) { call.reject("index requerido"); return; }
        getActivity().runOnUiThread(() -> {
            if (pager != null && index >= 0 && index < urls.size()
                    && pager.getCurrentItem() != index) {
                pager.setCurrentItem(index, false);
            }
            call.resolve();
        });
    }

    /** Quita el feed nativo y restaura el WebView opaco. */
    @PluginMethod
    public void hide(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopProgress();
            WebView web = getBridge().getWebView();
            web.setBackgroundColor(Color.WHITE);
            // Quitar el OnTouchListener de reenvío de gestos: si queda pegado tras
            // destruir el pager, el siguiente toque entra al listener con pager=null.
            // El guard interno ya evita el NPE, pero soltarlo restaura el WebView a su
            // manejo normal de toques (sin reenvíos al feed ya inexistente).
            web.setOnTouchListener(null);
            if (adapter != null) adapter.releaseAll();
            if (pagerRoot != null) {
                ViewGroup parent = (ViewGroup) pagerRoot.getParent();
                if (parent != null) parent.removeView(pagerRoot);
                pagerRoot = null;
                pager = null;
                adapter = null;
                revealed = false; // próximo show() vuelve a empezar oculto
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        stopProgress();
        if (adapter != null) adapter.releaseAll();
    }
}
