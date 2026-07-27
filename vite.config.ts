import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // /mnt/* is a Windows drive mounted through drvfs, where inotify events
    // never fire — without polling the watcher sees nothing and HMR dies
    // silently. Native Linux paths keep the cheap inotify watcher.
    watch: __dirname.startsWith('/mnt/')
      ? { usePolling: true, interval: 300 }
      : undefined,
  },
})
