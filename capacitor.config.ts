import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telierlabs.cylen',
  appName: 'Cylen',
  webDir: 'dist',
  server: {
    url: 'https://www.cylenai.com',
    cleartext: false
  }
};

export default config;
