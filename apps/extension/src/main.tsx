import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { BPassApp, PlatformProvider } from "@bpass/ui"
import { extensionPlatform } from "@bpass/platform-extension"
import "./main.css"

function syncColorScheme() {
  const root = document.documentElement
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches
  root.classList.toggle("dark", dark)
}

function ExtensionRoot() {
  useEffect(() => {
    syncColorScheme()
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => syncColorScheme()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return (
    <PlatformProvider platform={extensionPlatform}>
      <BPassApp />
    </PlatformProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExtensionRoot />
  </StrictMode>,
)
