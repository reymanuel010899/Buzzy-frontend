import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buzzy.app',
  appName: 'Buzzy',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '993295175092-6l5q4g5u401ieunl4pjp7lqj5psjpunj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
