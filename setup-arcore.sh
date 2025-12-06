#!/bin/bash

# ARCore Setup Script for Buzzy Frontend
# This script sets up the ARCore integration for the Buzzy streaming platform

set -e

echo "🚀 Setting up ARCore integration for Buzzy..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_warning "This script is optimized for Linux. Some features may not work on other platforms."
fi

# Check Node.js installation
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# Check npm installation
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

print_success "npm $(npm -v) is installed"

# Install web dependencies
print_status "Installing web dependencies..."
npm install @react-three/fiber @react-three/xr three
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
npm install framer-motion lucide-react

print_success "Web dependencies installed"

# Check Android development environment
print_status "Checking Android development environment..."

# Check if Android SDK is installed
if [ -z "$ANDROID_HOME" ]; then
    print_warning "ANDROID_HOME is not set. Android development may not work properly."
    print_status "To set up Android development:"
    echo "1. Install Android Studio"
    echo "2. Set ANDROID_HOME environment variable"
    echo "3. Add platform-tools to PATH"
else
    print_success "Android SDK found at: $ANDROID_HOME"
fi

# Check if adb is available
if command -v adb &> /dev/null; then
    print_success "ADB is available"
else
    print_warning "ADB not found. Android device testing will not be available."
fi

# Create Android project structure if it doesn't exist
print_status "Setting up Android project structure..."
if [ ! -d "android" ]; then
    mkdir -p android/app/src/main/java/com/buzzy/ar
    mkdir -p android/app/src/main/res/layout
    mkdir -p android/app/src/main/res/values
    mkdir -p android/app/src/main/res/drawable
    print_success "Android project structure created"
else
    print_success "Android project structure already exists"
fi

# Create necessary Android files
print_status "Creating Android configuration files..."

# Create build.gradle if it doesn't exist
if [ ! -f "android/app/build.gradle" ]; then
    cat > android/app/build.gradle << 'EOF'
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.buzzy.ar'
    compileSdk 34

    defaultConfig {
        applicationId "com.buzzy.ar"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'com.google.ar:core:1.40.0'
    implementation 'com.google.ar.sceneform:core:1.17.1'
    implementation 'com.google.ar.sceneform:ux:1.17.1'
    implementation 'com.google.mlkit:object-detection:17.0.0'
    implementation 'org.tensorflow:tensorflow-lite:2.14.0'
}
EOF
    print_success "build.gradle created"
fi

# Create AndroidManifest.xml if it doesn't exist
if [ ! -f "android/app/src/main/AndroidManifest.xml" ]; then
    cat > android/app/src/main/AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-feature android:name="android.hardware.camera.ar" android:required="true" />
    <uses-feature android:name="android.hardware.sensor.accelerometer" android:required="true" />
    <uses-feature android:name="android.hardware.sensor.gyroscope" android:required="true" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.BuzzyAR">

        <meta-data android:name="com.google.ar.core" android:value="required" />

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
EOF
    print_success "AndroidManifest.xml created"
fi

# Create strings.xml if it doesn't exist
if [ ! -f "android/app/src/main/res/values/strings.xml" ]; then
    cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Buzzy AR</string>
</resources>
EOF
    print_success "strings.xml created"
fi

# Create colors.xml if it doesn't exist
if [ ! -f "android/app/src/main/res/values/colors.xml" ]; then
    cat > android/app/src/main/res/values/colors.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">#7000ff</color>
    <color name="secondary">#00f0ff</color>
    <color name="black">#000000</color>
    <color name="white">#ffffff</color>
    <color name="light_gray">#cccccc</color>
</resources>
EOF
    print_success "colors.xml created"
fi

# Create styles.xml if it doesn't exist
if [ ! -f "android/app/src/main/res/values/styles.xml" ]; then
    cat > android/app/src/main/res/values/styles.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.BuzzyAR" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorSecondary">@color/secondary</item>
        <item name="android:statusBarColor">@color/black</item>
        <item name="android:navigationBarColor">@color/black</item>
    </style>
</resources>
EOF
    print_success "styles.xml created"
fi

# Create gradle wrapper if it doesn't exist
if [ ! -f "android/gradlew" ]; then
    print_status "Creating Gradle wrapper..."
    cd android
    gradle wrapper
    cd ..
    print_success "Gradle wrapper created"
fi

# Create .gitignore for Android
if [ ! -f "android/.gitignore" ]; then
    cat > android/.gitignore << 'EOF'
*.iml
.gradle
/local.properties
/.idea
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
EOF
    print_success "Android .gitignore created"
fi

# Check if development server is running
print_status "Checking if development server is running..."
if curl -s http://localhost:5173 > /dev/null; then
    print_success "Development server is running on http://localhost:5173"
else
    print_warning "Development server is not running. Start it with: npm run dev"
fi

# Create environment setup script
print_status "Creating environment setup script..."
cat > setup-env.sh << 'EOF'
#!/bin/bash

# Environment setup for ARCore development

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

echo "Android environment variables set:"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "PATH updated with Android tools"
EOF

chmod +x setup-env.sh
print_success "Environment setup script created"

# Create build script
print_status "Creating build script..."
cat > build-android.sh << 'EOF'
#!/bin/bash

# Build Android app with ARCore

set -e

echo "Building Android app..."

cd android

# Clean previous builds
./gradlew clean

# Build debug APK
./gradlew assembleDebug

echo "Build completed successfully!"
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"

# Install on connected device if available
if adb devices | grep -q "device$"; then
    echo "Installing on connected device..."
    adb install app/build/outputs/apk/debug/app-debug.apk
    echo "App installed successfully!"
else
    echo "No Android device connected. Connect a device to install automatically."
fi

cd ..
EOF

chmod +x build-android.sh
print_success "Build script created"

# Create test script
print_status "Creating test script..."
cat > test-arcore.sh << 'EOF'
#!/bin/bash

# Test ARCore integration

set -e

echo "Testing ARCore integration..."

# Check if development server is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "Starting development server..."
    npm run dev &
    sleep 5
fi

# Open ARCore test page
echo "Opening ARCore test page..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173/enhanced-arcore
elif command -v open &> /dev/null; then
    open http://localhost:5173/enhanced-arcore
else
    echo "Please open: http://localhost:5173/enhanced-arcore"
fi

echo "ARCore test page opened!"
echo "Test the following features:"
echo "1. Object detection"
echo "2. Video placement"
echo "3. Social AR features"
EOF

chmod +x test-arcore.sh
print_success "Test script created"

# Final setup instructions
print_success "ARCore integration setup completed!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Set up Android development environment:"
echo "   source setup-env.sh"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Test ARCore integration:"
echo "   ./test-arcore.sh"
echo ""
echo "4. Build Android app:"
echo "   ./build-android.sh"
echo ""
echo "5. Access ARCore features:"
echo "   - Basic AR: http://localhost:5173/arcore"
echo "   - Enhanced AR: http://localhost:5173/enhanced-arcore"
echo ""
echo "📚 Documentation:"
echo "   - ARCore Integration Guide: ARCore_INTEGRATION.md"
echo "   - Android Setup: android/README.md"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check device compatibility for ARCore"
echo "   - Ensure camera permissions are granted"
echo "   - Verify WebXR support in browser"
echo ""

print_success "Setup completed successfully! 🎉" 