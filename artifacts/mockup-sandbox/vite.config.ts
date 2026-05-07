import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { mockupPreviewPlugin } from './mockupPreviewPlugin';

const rawPort = process.env.PORT ?? '4173';
const parsedPort = Number(rawPort);
const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? 4173 : parsedPort;
const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin() as PluginOption,
    react() as PluginOption,
    tailwindcss() as PluginOption,
    runtimeErrorOverlay() as PluginOption,
    ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }) as PluginOption,
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
