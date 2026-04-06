import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: currentDirectory,
  plugins: [react()],
  resolve: {
    alias: {
      '#pentix/core': path.resolve(
        currentDirectory,
        '../../packages/pentix-core/src/index.ts',
      ),
    },
  },
})
