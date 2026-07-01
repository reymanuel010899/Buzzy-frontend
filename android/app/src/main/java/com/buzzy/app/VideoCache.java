package com.buzzy.app;

import android.content.Context;

import androidx.annotation.OptIn;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.database.StandaloneDatabaseProvider;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.cache.CacheDataSource;
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor;
import androidx.media3.datasource.cache.SimpleCache;

import java.io.File;

/**
 * Caché de video/música EN DISCO compartida por todo el feed nativo (como TikTok).
 *
 * Sin esto, cada vez que vuelves a un video (scroll arriba) o se re-firma la URL,
 * ExoPlayer lo RE-DESCARGABA por red → espera/freeze. Con SimpleCache, los bytes ya
 * vistos se sirven desde disco al instante. La caché es ÚNICA en el proceso
 * (SimpleCache no admite dos instancias sobre el mismo directorio).
 *
 * Clave de caché: la RUTA del archivo SIN el query de firma (?expires=&sig=). Como la
 * firma cambia en cada feed, usar la URL completa haría que la misma pista/video se
 * guardara N veces y nunca acertara. Con setCacheKeyFactory(ruta) el cache acierta
 * aunque la firma haya cambiado.
 */
@OptIn(markerClass = UnstableApi.class)
public final class VideoCache {

    private static SimpleCache cache;
    private static final long MAX_BYTES = 256L * 1024 * 1024; // 256 MB

    private VideoCache() {}

    private static synchronized SimpleCache getCache(Context ctx) {
        if (cache == null) {
            File dir = new File(ctx.getCacheDir(), "buzzy_video_cache");
            cache = new SimpleCache(
                dir,
                new LeastRecentlyUsedCacheEvictor(MAX_BYTES),
                new StandaloneDatabaseProvider(ctx));
        }
        return cache;
    }

    /**
     * DataSource.Factory con caché de disco + red, indexada por la RUTA (sin firma).
     * Úsalo para CREAR los MediaSource de video y música. Lecturas/escrituras pasan
     * por la caché; lo que ya está en disco no toca la red.
     */
    public static DataSource.Factory cachedFactory(Context ctx) {
        Context app = ctx.getApplicationContext();

        // Upstream: HTTP (con redirects cross-protocol) envuelto en DefaultDataSource
        // para soportar también file:// y otros esquemas.
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(15000);
        DefaultDataSource.Factory upstream = new DefaultDataSource.Factory(app, http);

        return new CacheDataSource.Factory()
            .setCache(getCache(app))
            .setUpstreamDataSourceFactory(upstream)
            // Clave estable = ruta sin query (la firma cambia en cada feed).
            .setCacheKeyFactory(dataSpec -> {
                String s = dataSpec.uri.toString();
                int q = s.indexOf('?');
                return q >= 0 ? s.substring(0, q) : s;
            })
            // No fallar si la caché está corrupta/llena: degradar a red.
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR);
    }
}
