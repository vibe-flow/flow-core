/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_LOGIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
