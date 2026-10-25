import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oceanaprofx.portal',
  appName: 'oceanaprofx',
  webDir: 'build', // not used when server.url present
  server: {
    url: 'https://user.oceanaprofx.com',
    cleartext: false
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: "#000000"
    }
  }
};

export default config;
