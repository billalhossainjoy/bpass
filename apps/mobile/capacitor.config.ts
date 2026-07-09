import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.bpass.authenticator",
  appName: "BPass",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#ffffff",
    contentInset: "automatic",
  },
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ffffff",
    },
  },
}

export default config
