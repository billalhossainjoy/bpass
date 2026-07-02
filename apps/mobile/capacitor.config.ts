import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.bpass.authenticator",
  appName: "BPass",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#171717",
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#171717",
    contentInset: "automatic",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#171717",
    },
  },
}

export default config
