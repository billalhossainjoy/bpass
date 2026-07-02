/// <reference types="vite/client" />
/// <reference types="@capacitor/core" />
/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/app" />

declare module "*.css" {
  const classes: string
  export default classes
}

declare module "@ionic/react/css/*.css" {
  const classes: string
  export default classes
}
