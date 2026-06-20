package com.buzzy.app;

import android.Manifest;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Aceleración por hardware a nivel de ventana. Es el lugar CORRECTO para
        // forzarla (no en el WebView): garantiza que el compositor de la Activity
        // entregue la surface de <video> al decodificador de hardware. Sin esto,
        // ciertos dispositivos Android pintan el video por tiles ("cuadritos":
        // mitad, luego esquinas) aunque en el navegador de escritorio se vea nítido.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // ── Tuning para que el WebView se sienta nativo ──────────────────
            // Prioridad de render alta: la UI responde más rápido al scroll/tap.
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            // Cache normal: reutiliza assets ya descargados (arranque más veloz).
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            // Autoplay de video sin gesto del usuario (feed estilo TikTok fluido).
            settings.setMediaPlaybackRequiresUserGesture(false);
            // Mata el "glow" azul de overscroll de Android al llegar al borde:
            // ese efecto delata que es una web; las apps nativas no lo tienen.
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            // NOTA: NO forzar setLayerType(LAYER_TYPE_HARDWARE) sobre todo el WebView.
            // La aceleración por hardware ya está activa por defecto en Android, y
            // forzar una capa de HW global entra en conflicto con la surface de
            // decodificación de <video> → el video se pinta por tiles ("cuadritos").
            // La promoción a GPU se hace por elemento (translateZ(0) en el <video>).
            // Debug del WebView SOLO en builds debug (para chrome://inspect).
            // En producción (release) queda desactivado para evitar overhead.
            WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

            // Allow WebView to request microphone permission for getUserMedia
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        request.grant(request.getResources());
                    });
                }
            });
        }
    }
}
