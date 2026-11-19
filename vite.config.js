import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import comprobar from './api/comprobar.js'
import lista from './api/lista.js'

// En local servimos las mismas funciones que usa Vercel en /api/*.
const apiLocal = {
  name: 'api-local',
  configureServer(server) {
    server.middlewares.use('/api/comprobar', comprobar)
    server.middlewares.use('/api/lista', lista)
  },
}

export default defineConfig({
  plugins: [react(), apiLocal],
  // En WSL los cambios en /mnt/c no generan eventos de fichero.
  server: { watch: { usePolling: true, interval: 300 } },
})
