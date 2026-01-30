import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import path from 'node:path'
import url from 'node:url'
import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default vite.defineConfig({
    assetsInclude: [
        'oxigraph/*',
    ],
    base: 'https://celldl.github.io/CellDLViewer/',
    build: {
        chunkSizeWarningLimit: 2048,
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`
            }
        },
        sourcemap: true,
        target: 'esnext'
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        },
        exclude: [
            '*.wasm'
        ]
    },
    plugins: [
        // Note: this must be in sync with electron.vite.config.ts.

        tailwindcssPlugin(),
        vuePlugin(),
        vitePlugin({
            resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            'node-fetch': 'isomorphic-fetch',
            '@editor': path.resolve(_dirname, 'src/CellDL'),
            '@oxigraph': path.resolve(_dirname, 'src/assets/oxigraph'),
            '@renderer': path.resolve(_dirname, 'src')
        }
    },
    server: {
        fs: {
            allow: [path.join(_dirname, '../..')]
        }
    }
})
