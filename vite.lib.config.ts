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
                exports: 'named',
                globals: {
                    vue: 'Vue'
                },
                assetFileNames: (assetInfo: { names: string }) => {
                    if (assetInfo.names.includes('celldl-editor.css')) {
                        return 'CellDLViewer.css'
                    }

                    return assetInfo.names[0] ?? 'default-name'
                },
                manualChunks: (id: string) => {
                    // List of modules that rollup sometimes bundles with manual chunks
                    // causing those chunks to be eager-loaded
                    const ROLLUP_COMMON_MODULES = [
                        'vite/preload-helper',
                        'vite/modulepreload-polyfill',
                        'vite/dynamic-import-helper',
                        'commonjsHelpers',
                        'commonjs-dynamic-modules',
                        '__vite-browser-external'
                    ];

                    // Bundle all 3rd-party modules into a single vendor.js module
                    if (id.includes('node_modules')
                     || ROLLUP_COMMON_MODULES.some((commonModule) => id.includes(commonModule))) {
                        return 'vendor';
                    }

                    // All other files are project source files and are allowed
                    // to be split whichever way rollup wants
                }
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
