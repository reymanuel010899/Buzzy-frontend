package com.buzzy.ar

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.ar.core.ArCoreApk
import com.google.ar.sceneform.ux.ArFragment

class MainActivity : AppCompatActivity() {
    
    private lateinit var webView: WebView
    private lateinit var arFragment: ArFragment
    private lateinit var arCoreBridge: ARCoreBridge
    
    companion object {
        private const val CAMERA_PERMISSION_REQUEST_CODE = 100
        private const val AR_CORE_INSTALL_REQUEST_CODE = 200
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        setupWebView()
        setupARFragment()
        checkPermissions()
    }
    
    private fun setupWebView() {
        webView = findViewById(R.id.webview)
        
        // Configurar WebView
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            mediaPlaybackRequiresUserGesture = false
        }
        
        // Configurar WebViewClient
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Inyectar JavaScript para configurar ARCore Bridge
                injectARCoreBridge()
            }
        }
        
        // Cargar la aplicación web
        webView.loadUrl("http://localhost:5173") // URL de desarrollo de Vite
    }
    
    private fun setupARFragment() {
        arFragment = supportFragmentManager.findFragmentById(R.id.ar_fragment) as ArFragment
        
        // Configurar ARCore Bridge
        arCoreBridge = ARCoreBridge(this, webView, arFragment)
        
        // Agregar JavaScript interface
        webView.addJavascriptInterface(arCoreBridge, "ARCoreBridge")
    }
    
    private fun injectARCoreBridge() {
        val bridgeScript = """
            (function() {
                // Crear bridge global para ARCore
                window.ARCoreBridge = {
                    isSupported: function() {
                        return new Promise((resolve) => {
                            const result = window.ARCoreBridge.isSupported();
                            resolve(result);
                        });
                    },
                    
                    startSession: function(config) {
                        return new Promise((resolve, reject) => {
                            try {
                                const configJson = JSON.stringify(config);
                                const result = window.ARCoreBridge.startSession(configJson);
                                const sessionData = JSON.parse(result);
                                
                                if (sessionData.error) {
                                    reject(new Error(sessionData.error));
                                } else {
                                    resolve(sessionData);
                                }
                            } catch (error) {
                                reject(error);
                            }
                        });
                    },
                    
                    stopSession: function() {
                        return new Promise((resolve) => {
                            window.ARCoreBridge.stopSession();
                            resolve();
                        });
                    },
                    
                    placeObject: function(type, position) {
                        return new Promise((resolve, reject) => {
                            try {
                                const positionJson = JSON.stringify(position);
                                window.ARCoreBridge.placeObject(type, positionJson);
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        });
                    },
                    
                    onPlaneDetected: function(callback) {
                        window.ARCoreBridge.onPlaneDetected(callback.toString());
                    },
                    
                    onObjectDetected: function(callback) {
                        window.ARCoreBridge.onObjectDetected(callback.toString());
                    },
                    
                    onImageTracked: function(callback) {
                        window.ARCoreBridge.onImageTracked(callback.toString());
                    }
                };
                
                console.log('ARCore Bridge initialized');
            })();
        """.trimIndent()
        
        webView.evaluateJavascript(bridgeScript, null)
    }
    
    private fun checkPermissions() {
        val cameraPermission = ContextCompat.checkSelfPermission(
            this, 
            Manifest.permission.CAMERA
        )
        
        if (cameraPermission != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_REQUEST_CODE
            )
        } else {
            checkARCoreAvailability()
        }
    }
    
    private fun checkARCoreAvailability() {
        val availability = ArCoreApk.getInstance().checkAvailability(this)
        
        when (availability) {
            ArCoreApk.Availability.SUPPORTED_INSTALLED -> {
                // ARCore está disponible y instalado
                Toast.makeText(this, "ARCore ready", Toast.LENGTH_SHORT).show()
            }
            ArCoreApk.Availability.SUPPORTED_APK_TOO_OLD -> {
                // ARCore necesita actualización
                requestARCoreInstall()
            }
            ArCoreApk.Availability.SUPPORTED_NOT_INSTALLED -> {
                // ARCore no está instalado
                requestARCoreInstall()
            }
            ArCoreApk.Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE -> {
                // Dispositivo no compatible
                Toast.makeText(
                    this, 
                    "Device not compatible with ARCore", 
                    Toast.LENGTH_LONG
                ).show()
            }
            ArCoreApk.Availability.UNKNOWN_CHECKING -> {
                // Verificando disponibilidad
                Toast.makeText(this, "Checking ARCore availability...", Toast.LENGTH_SHORT).show()
            }
            ArCoreApk.Availability.UNKNOWN_ERROR -> {
                // Error desconocido
                Toast.makeText(this, "Error checking ARCore", Toast.LENGTH_SHORT).show()
            }
            ArCoreApk.Availability.UNKNOWN_TIMED_OUT -> {
                // Timeout
                Toast.makeText(this, "ARCore check timed out", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun requestARCoreInstall() {
        try {
            ArCoreApk.getInstance().requestInstall(this, true)
        } catch (e: Exception) {
            Toast.makeText(this, "Error requesting ARCore install", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        when (requestCode) {
            CAMERA_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    checkARCoreAvailability()
                } else {
                    Toast.makeText(
                        this, 
                        "Camera permission required for AR", 
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Bundle?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == AR_CORE_INSTALL_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                Toast.makeText(this, "ARCore installed successfully", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "ARCore installation failed", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        webView.destroy()
    }
} 