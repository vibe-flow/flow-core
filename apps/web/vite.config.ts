import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env from monorepo root
  const envDir = path.resolve(__dirname, '../..')
  const env = loadEnv(mode, envDir, '')

  // Configurable ports via .env
  const frontendPort = parseInt(env.FRONTEND_PORT || '5173', 10)
  const backendPort = parseInt(env.BACKEND_PORT || '3000', 10)
  const backendTarget = `http://localhost:${backendPort}`

  return {
    plugins: [react()],
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: frontendPort,
      // Échouer bruyamment plutôt que glisser en silence sur le port suivant : le
      // proxy garderait sa cible et l'on testerait, au mieux, l'app d'à côté.
      strictPort: true,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/trpc': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
