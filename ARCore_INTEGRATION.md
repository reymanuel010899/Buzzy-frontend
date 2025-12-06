# ARCore Integration for Buzzy

## Overview

This document describes the integration of Google ARCore with the Buzzy streaming platform, enabling advanced augmented reality features for video content and social interactions.

## Architecture

### Hybrid Approach
The integration uses a hybrid approach combining:
- **Native Android ARCore** for full AR capabilities
- **WebXR** as fallback for web browsers
- **TensorFlow.js** for object detection
- **Three.js** for 3D rendering

### Components

1. **ARCore Bridge** (`android/ARCoreBridge.kt`)
   - Native Android bridge for ARCore functionality
   - JavaScript interface for web communication
   - Object detection and plane tracking

2. **Enhanced ARCore Component** (`src/components/ar/EnhancedARCore.tsx`)
   - React component with AR functionality
   - Multiple AR modes (Object Detection, Video Placement, Social AR)
   - Integration with existing streaming features

3. **Main Activity** (`android/MainActivity.kt`)
   - Android activity hosting WebView and ARFragment
   - Permission handling and ARCore availability checks

## Features

### 1. Object Detection
- Real-time object detection using TensorFlow.js
- Integration with ARCore's plane detection
- Visual feedback for detected objects

### 2. Video Placement in AR
- Place streaming videos in 3D space
- Interactive video positioning
- Social sharing of AR experiences

### 3. Social AR Features
- Multi-user AR sessions
- Shared object placement
- Real-time collaboration

## Setup Instructions

### Prerequisites

1. **Android Development Environment**
   ```bash
   # Install Android Studio
   # Configure Android SDK
   # Set up ARCore SDK
   ```

2. **ARCore SDK Installation**
   ```bash
   # Add to build.gradle
   implementation 'com.google.ar:core:1.40.0'
   implementation 'com.google.ar.sceneform:core:1.17.1'
   ```

3. **Web Dependencies**
   ```bash
   npm install @react-three/fiber @react-three/xr three
   npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
   ```

### Android Setup

1. **Create Android Project**
   ```bash
   # Create new Android project
   # Add ARCore dependencies
   # Configure permissions in AndroidManifest.xml
   ```

2. **Configure ARCore**
   ```xml
   <!-- AndroidManifest.xml -->
   <meta-data android:name="com.google.ar.core" android:value="required" />
   <uses-feature android:name="android.hardware.camera.ar" android:required="true" />
   ```

3. **Build and Install**
   ```bash
   ./gradlew assembleDebug
   adb install app-debug.apk
   ```

### Web Integration

1. **Add Routes**
   ```typescript
   // src/router/index.tsx
   <Route path="/enhanced-arcore" element={<EnhancedARCore/>} />
   ```

2. **Configure Bridge**
   ```typescript
   // The bridge is automatically injected when running in Android WebView
   window.ARCoreBridge?.startSession(config)
   ```

## Usage

### Basic AR Session

```typescript
import EnhancedARCore from '../components/ar/EnhancedARCore';

// Start AR session
const startAR = async () => {
  if (window.ARCoreBridge) {
    const session = await window.ARCoreBridge.startSession({
      enablePlaneDetection: true,
      enableObjectTracking: true,
    });
  }
};
```

### Object Detection

```typescript
// Configure object detection callbacks
window.ARCoreBridge?.onObjectDetected((objectData) => {
  const objects = JSON.parse(objectData);
  console.log('Detected objects:', objects);
});
```

### Video Placement

```typescript
// Place video in AR space
const placeVideo = async (videoUrl: string, position: Vector3) => {
  await window.ARCoreBridge?.placeObject('video', position);
};
```

## API Reference

### ARCore Bridge Methods

#### `isSupported(): Promise<boolean>`
Check if ARCore is supported on the device.

#### `startSession(config: ARCoreConfig): Promise<ARCoreSession>`
Start an AR session with the specified configuration.

**Config Options:**
- `enablePlaneDetection: boolean`
- `enableImageTracking: boolean`
- `enableObjectTracking: boolean`
- `enableDepthEstimation: boolean`

#### `stopSession(): Promise<void>`
Stop the current AR session.

#### `placeObject(type: string, position: Vector3): Promise<void>`
Place a 3D object in AR space.

#### Event Callbacks
- `onPlaneDetected(callback: (data: string) => void)`
- `onObjectDetected(callback: (data: string) => void)`
- `onImageTracked(callback: (data: string) => void)`

### AR Modes

#### 1. Object Detection Mode
- Real-time object detection using camera feed
- Visual markers for detected objects
- Confidence scoring

#### 2. Video Placement Mode
- Place streaming videos in 3D space
- Interactive positioning
- Video playback controls

#### 3. Social AR Mode
- Multi-user AR sessions
- Shared object placement
- Real-time collaboration

## Performance Considerations

### Optimization Tips

1. **Object Detection**
   - Limit detection frequency
   - Use appropriate model size
   - Implement object caching

2. **3D Rendering**
   - Use LOD (Level of Detail)
   - Implement frustum culling
   - Optimize texture sizes

3. **Memory Management**
   - Dispose of unused resources
   - Implement proper cleanup
   - Monitor memory usage

### Device Compatibility

#### Supported Devices
- Android devices with ARCore support
- iOS devices with ARKit (WebXR fallback)
- Modern web browsers (WebXR)

#### Minimum Requirements
- Android 7.0+ (API level 24)
- OpenGL ES 3.0 support
- Camera and motion sensors

## Troubleshooting

### Common Issues

1. **ARCore Not Available**
   ```bash
   # Check device compatibility
   # Install ARCore from Play Store
   # Verify permissions
   ```

2. **Camera Access Denied**
   ```xml
   <!-- Ensure camera permission in manifest -->
   <uses-permission android:name="android.permission.CAMERA" />
   ```

3. **WebXR Not Supported**
   ```typescript
   // Fallback to basic AR features
   // Use device motion sensors
   // Implement alternative UI
   ```

### Debug Mode

Enable debug logging:
```typescript
// Enable ARCore debug mode
window.ARCoreBridge?.setDebugMode(true);
```

## Future Enhancements

### Planned Features

1. **Advanced Object Tracking**
   - Persistent object tracking
   - Multi-object tracking
   - Custom object models

2. **Enhanced Social Features**
   - Real-time multiplayer AR
   - Shared AR experiences
   - AR content creation tools

3. **Performance Improvements**
   - Hardware acceleration
   - Optimized rendering pipeline
   - Better memory management

### Integration Roadmap

1. **Phase 1: Basic AR Integration** ✅
   - Object detection
   - Video placement
   - Basic AR session management

2. **Phase 2: Enhanced Features** 🚧
   - Social AR features
   - Advanced object tracking
   - Performance optimizations

3. **Phase 3: Advanced Capabilities** 📋
   - Multi-user AR sessions
   - AR content creation
   - Cross-platform compatibility

## Contributing

### Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd Buzzy-frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Android Environment**
   ```bash
   # Configure Android Studio
   # Install ARCore SDK
   # Set up development device
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

### Testing

1. **Web Testing**
   ```bash
   npm run test
   npm run test:ar
   ```

2. **Android Testing**
   ```bash
   ./gradlew test
   ./gradlew connectedAndroidTest
   ```

3. **AR Testing**
   - Test on ARCore-compatible devices
   - Verify object detection accuracy
   - Test video placement functionality

## Support

### Documentation
- [ARCore Developer Guide](https://developers.google.com/ar)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Three.js Documentation](https://threejs.org/docs/)

### Community
- [ARCore Community](https://developers.google.com/ar/community)
- [WebXR Community Group](https://www.w3.org/community/webxr/)

### Issues
Report issues and feature requests through the project's issue tracker.

---

**Note:** This integration requires ARCore-compatible Android devices for full functionality. Web browsers will use WebXR as a fallback with limited features. 