import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buzzy.app',
  appName: 'Buzzy',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
