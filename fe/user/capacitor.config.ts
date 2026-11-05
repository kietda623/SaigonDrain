import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.saigondrain.app",
  appName: "SaigonDrain AI",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "always",
  },
  plugins: {
    Geolocation: {},
  },
}

export default config
