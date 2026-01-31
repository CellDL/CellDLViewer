<template lang="pug">
    CellDLViewer.grow(
        :annotations="annotations"
        :celldlData="celldlData"
        :theme="theme"
        @error="onError"
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

const emit = defineEmits<{
    'error': [msg: string]
}>()

function onError(msg: string) {
    emit('error', msg)
}
</script>
