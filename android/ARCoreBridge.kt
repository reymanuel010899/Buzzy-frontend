package com.buzzy.ar

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.ar.core.*
import com.google.ar.sceneform.ArSceneView
import com.google.ar.sceneform.rendering.ModelRenderable
import com.google.ar.sceneform.rendering.Renderable
import com.google.ar.sceneform.ux.ArFragment
import com.google.ar.sceneform.ux.TransformableNode
import org.json.JSONObject
import java.util.concurrent.CompletableFuture

class ARCoreBridge(
    private val context: Context,
    private val webView: WebView,
    private val arFragment: ArFragment
) {
    
    private var arSession: Session? = null
    private var arSceneView: ArSceneView? = null
    private var currentSessionId: String? = null
    private var isSessionActive = false
    
    // Callbacks para comunicación con JavaScript
    private var onPlaneDetectedCallback: ((String) -> Unit)? = null
    private var onObjectDetectedCallback: ((String) -> Unit)? = null
    private var onImageTrackedCallback: ((String) -> Unit)? = null
    
    init {
        setupARSceneView()
        setupSessionCallbacks()
    }
    
    private fun setupARSceneView() {
        arSceneView = arFragment.arSceneView
        arSceneView?.scene?.addOnUpdateListener { frameTime ->
            updateARFrame()
        }
    }
    
    private fun setupSessionCallbacks() {
        arFragment.setOnSessionInitializationListener { session ->
            arSession = session
            currentSessionId = session.sessionId
            isSessionActive = true
            
            // Notificar a JavaScript que la sesión está activa
            notifySessionStarted()
        }
        
        arFragment.setOnTapArPlaneListener { hitResult, plane, motionEvent ->
            // Manejar tap en plano AR
            handlePlaneTap(hitResult, plane)
        }
    }
    
    @JavascriptInterface
    fun isSupported(): Boolean {
        return ArCoreApk.getInstance().checkAvailability(context) == ArCoreApk.Availability.SUPPORTED_INSTALLED
    }
    
    @JavascriptInterface
    fun startSession(configJson: String): String {
        try {
            val config = JSONObject(configJson)
            
            // Configurar características de ARCore basadas en la configuración
            val sessionConfig = Session.Configuration(arFragment.arSceneView?.session)
            
            // Habilitar detección de planos
            if (config.optBoolean("enablePlaneDetection", true)) {
                sessionConfig.planeFindingMode = Session.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
            }
            
            // Habilitar tracking de imágenes
            if (config.optBoolean("enableImageTracking", true)) {
                // Configurar tracking de imágenes si hay imágenes de referencia
                setupImageTracking()
            }
            
            // Habilitar tracking de objetos
            if (config.optBoolean("enableObjectTracking", true)) {
                setupObjectTracking()
            }
            
            // Habilitar estimación de profundidad
            if (config.optBoolean("enableDepthEstimation", false)) {
                sessionConfig.depthMode = Session.DepthMode.AUTOMATIC
            }
            
            // Iniciar sesión
            arSession?.configure(sessionConfig)
            arSession?.resume()
            
            return JSONObject().apply {
                put("sessionId", currentSessionId ?: "")
                put("isActive", isSessionActive)
                put("trackingState", "TRACKING")
                put("anchors", "[]")
            }.toString()
            
        } catch (e: Exception) {
            e.printStackTrace()
            return JSONObject().apply {
                put("error", e.message)
            }.toString()
        }
    }
    
    @JavascriptInterface
    fun stopSession() {
        try {
            arSession?.pause()
            arSession?.close()
            isSessionActive = false
            currentSessionId = null
            
            // Limpiar escena
            arSceneView?.scene?.callAllOnUpdateListeners()
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    @JavascriptInterface
    fun placeObject(objectType: String, positionJson: String) {
        try {
            val position = JSONObject(positionJson)
            val x = position.getDouble("x")
            val y = position.getDouble("y")
            val z = position.getDouble("z")
            
            when (objectType) {
                "cube" -> placeCube(x, y, z)
                "sphere" -> placeSphere(x, y, z)
                "model" -> place3DModel(x, y, z)
                else -> placeDefaultObject(x, y, z)
            }
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    @JavascriptInterface
    fun onPlaneDetected(callback: String) {
        onPlaneDetectedCallback = { planeData ->
            webView.post {
                webView.evaluateJavascript("$callback('$planeData')", null)
            }
        }
    }
    
    @JavascriptInterface
    fun onObjectDetected(callback: String) {
        onObjectDetectedCallback = { objectData ->
            webView.post {
                webView.evaluateJavascript("$callback('$objectData')", null)
            }
        }
    }
    
    @JavascriptInterface
    fun onImageTracked(callback: String) {
        onImageTrackedCallback = { imageData ->
            webView.post {
                webView.evaluateJavascript("$callback('$imageData')", null)
            }
        }
    }
    
    private fun updateARFrame() {
        val frame = arSession?.update()
        frame?.let { currentFrame ->
            
            // Detectar planos
            val updatedPlanes = currentFrame.getUpdatedTrackables(Plane::class.java)
            for (plane in updatedPlanes) {
                if (plane.trackingState == TrackingState.TRACKING) {
                    val planeData = JSONObject().apply {
                        put("id", plane.anchor?.anchorId ?: "")
                        put("type", "PLANE")
                        put("center", JSONObject().apply {
                            put("x", plane.centerPose.tx())
                            put("y", plane.centerPose.ty())
                            put("z", plane.centerPose.tz())
                        })
                        put("extentX", plane.extentX)
                        put("extentZ", plane.extentZ)
                    }.toString()
                    
                    onPlaneDetectedCallback?.invoke(planeData)
                }
            }
            
            // Detectar objetos (usando ML Kit o TensorFlow Lite)
            detectObjects(currentFrame)
            
            // Trackear imágenes
            trackImages(currentFrame)
        }
    }
    
    private fun detectObjects(frame: Frame) {
        // Implementar detección de objetos usando ML Kit
        // Esta es una implementación simplificada
        val detectedObjects = mutableListOf<JSONObject>()
        
        // Simular detección de objetos
        val objectData = JSONObject().apply {
            put("type", "person")
            put("confidence", 0.85)
            put("bounds", JSONObject().apply {
                put("left", 100)
                put("top", 100)
                put("right", 300)
                put("bottom", 400)
            })
        }
        
        detectedObjects.add(objectData)
        
        if (detectedObjects.isNotEmpty()) {
            val objectsJson = JSONObject().apply {
                put("objects", detectedObjects)
            }.toString()
            
            onObjectDetectedCallback?.invoke(objectsJson)
        }
    }
    
    private fun trackImages(frame: Frame) {
        val updatedImages = frame.getUpdatedTrackables(Trackable::class.java)
        for (trackable in updatedImages) {
            if (trackable is AugmentedImage && trackable.trackingState == TrackingState.TRACKING) {
                val imageData = JSONObject().apply {
                    put("id", trackable.index)
                    put("name", trackable.name ?: "")
                    put("centerPose", JSONObject().apply {
                        put("x", trackable.centerPose.tx())
                        put("y", trackable.centerPose.ty())
                        put("z", trackable.centerPose.tz())
                    })
                }.toString()
                
                onImageTrackedCallback?.invoke(imageData)
            }
        }
    }
    
    private fun handlePlaneTap(hitResult: HitResult, plane: Plane) {
        val anchor = hitResult.createAnchor()
        val anchorNode = TransformableNode(arFragment.transformationSystem)
        anchorNode.anchor = anchor
        
        // Crear un objeto 3D simple en el punto tocado
        placeDefaultObject(
            hitResult.hitPose.tx(),
            hitResult.hitPose.ty(),
            hitResult.hitPose.tz()
        )
    }
    
    private fun placeCube(x: Double, y: Double, z: Double) {
        ModelRenderable.builder()
            .setSource(context, R.raw.cube)
            .build()
            .thenAccept { renderable ->
                placeObject(renderable, x, y, z)
            }
            .exceptionally { throwable ->
                // Fallback a geometría simple
                placeDefaultObject(x, y, z)
                null
            }
    }
    
    private fun placeSphere(x: Double, y: Double, z: Double) {
        ModelRenderable.builder()
            .setSource(context, R.raw.sphere)
            .build()
            .thenAccept { renderable ->
                placeObject(renderable, x, y, z)
            }
            .exceptionally { throwable ->
                placeDefaultObject(x, y, z)
                null
            }
    }
    
    private fun place3DModel(x: Double, y: Double, z: Double) {
        ModelRenderable.builder()
            .setSource(context, R.raw.model_3d)
            .build()
            .thenAccept { renderable ->
                placeObject(renderable, x, y, z)
            }
            .exceptionally { throwable ->
                placeDefaultObject(x, y, z)
                null
            }
    }
    
    private fun placeDefaultObject(x: Double, y: Double, z: Double) {
        // Crear un cubo simple como objeto por defecto
        val materialFactory = MaterialFactory.makeOpaqueWithColor(context, com.google.ar.sceneform.rendering.Color(android.graphics.Color.RED))
        val cubeFactory = MaterialFactory.makeCubeWithMaterial(context, materialFactory)
        
        cubeFactory.thenAccept { renderable ->
            placeObject(renderable, x, y, z)
        }
    }
    
    private fun placeObject(renderable: Renderable, x: Double, y: Double, z: Double) {
        val anchorNode = TransformableNode(arFragment.transformationSystem)
        anchorNode.renderable = renderable
        anchorNode.setParent(arSceneView?.scene)
        anchorNode.localPosition = com.google.ar.sceneform.math.Vector3(x.toFloat(), y.toFloat(), z.toFloat())
    }
    
    private fun setupImageTracking() {
        // Configurar tracking de imágenes de referencia
        val augmentedImageDatabase = AugmentedImageDatabase(arSession)
        // Agregar imágenes de referencia aquí
        // augmentedImageDatabase.addImage("reference_image", bitmap)
        
        val sessionConfig = Session.Configuration(arSession)
        sessionConfig.augmentedImageDatabase = augmentedImageDatabase
    }
    
    private fun setupObjectTracking() {
        // Configurar tracking de objetos 3D
        // Esto requiere configuraciones específicas de ARCore
    }
    
    private fun notifySessionStarted() {
        val sessionData = JSONObject().apply {
            put("sessionId", currentSessionId ?: "")
            put("isActive", isSessionActive)
            put("trackingState", "TRACKING")
        }.toString()
        
        webView.post {
            webView.evaluateJavascript("window.ARCoreBridge.onSessionStarted('$sessionData')", null)
        }
    }
} 