<template lang="pug">
    CellDLViewer.grow(
        :annotation="annotation"
        :celldlData="celldlData"
        :theme="theme"
    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import type { CellDLViewerProps } from '../../index'

const props = defineProps<CellDLViewerProps>()

// Load oxigraph's WASM module before the editor is imported

import initOxigraph from '@oxigraph/web.js'
import * as oxigraph from '@oxigraph/web.js'

const CellDLViewer = vue.defineAsyncComponent(async () => {
    const wasm = await initOxigraph()
    globalThis.oxigraph = oxigraph
    return import('./CellDLViewer.vue')
})
</script>
