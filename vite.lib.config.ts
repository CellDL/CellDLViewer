import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import typescript from '@rollup/plugin-typescript'
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
    build: {
        lib: {
            entry: './index.ts',
            fileName: (format: string) => `CellDLViewer.${format}.js`,
            formats: ['es'],
            name: 'CellDLViewer'
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                dir: 'dist',
                exports: 'named',
                globals: {
                    vue: 'Vue'
                },
                assetFileNames: (assetInfo: { names: string[] }) => {
                    if (assetInfo.names.includes('viewer.css')) {
                        return 'CellDLViewer.css'
                    }
                    return assetInfo.names[0] ?? 'default-name'
                }
            },
            plugins: [
                typescript({
                    include: [
                        './index.ts',
                        'src/**'
                    ]
                }),
            ]
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
    resolve: {
        alias: {
            'node-fetch': 'isomorphic-fetch',
            '@oxigraph': path.resolve(_dirname, 'src/assets/oxigraph'),
            '@viewer': path.resolve(_dirname, 'src')
        }
    },
    plugins: [
        // Note: this must be in sync with vite.config.ts.

        tailwindcssPlugin(),
        vuePlugin(),
        vitePlugin({
            resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
        })
    ]
})
