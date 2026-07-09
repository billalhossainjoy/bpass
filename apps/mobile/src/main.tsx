import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { IonApp, IonContent, setupIonicReact } from "@ionic/react"
import { App as CapApp } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { StatusBar, Style } from "@capacitor/status-bar"
import { BPassApp, PlatformProvider } from "@bpass/ui"
import { createMobilePlatform } from "@bpass/platform-web"

import "@ionic/react/css/core.css"
import "@ionic/react/css/normalize.css"
import "@ionic/react/css/structure.css"
import "./main.css"

setupIonicReact({ mode: "ios" })

const mobilePlatform = createMobilePlatform()

function App() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    void StatusBar.setStyle({ style: Style.Light })
    void StatusBar.setBackgroundColor({ color: "#ffffff" })
    if (Capacitor.getPlatform() === "android") {
      void StatusBar.setOverlaysWebView({ overlay: false })
    }

    const backListener = CapApp.addListener("backButton", () => {
      void CapApp.exitApp()
    })

    return () => {
      void backListener.then((listener) => listener.remove())
    }
  }, [])

  return (
    <IonApp>
      <IonContent fullscreen scrollY={false}>
        <PlatformProvider platform={mobilePlatform}>
          <BPassApp />
        </PlatformProvider>
      </IonContent>
    </IonApp>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
