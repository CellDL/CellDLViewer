<template>
    <WrappedViewer
        :annotations="annotations"
        :svgData="svgData"
        :options="options"
        :theme="theme"
        @error="onError"
        @event="onEvent"
    />
</template>

<script setup lang="ts">
import * as vue from 'vue'

import type { SvgViewerProps, ViewerEvent } from '../index'

const props = defineProps<SvgViewerProps>()

// Load oxigraph's WASM module before the editor is imported

import initOxigraph from '../assets/oxigraph/web.js'
import * as oxigraph from '../assets/oxigraph/web.js'

const WrappedViewer = vue.defineAsyncComponent(async () => {
    const wasm = await initOxigraph()
    globalThis.oxigraph = oxigraph
    return import('./WrappedViewer.vue')
})

const emit = defineEmits<{
    'error': [msg: string]
    'event': [detail: ViewerEvent]
}>()

function onError(msg: string) {
    emit('error', msg)
}

function onEvent(detail: ViewerEvent) {
    emit('event', detail)
}
</script>
