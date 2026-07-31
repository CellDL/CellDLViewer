<template>
    <div ref="svgContent"></div>
</template>

<script setup lang="ts">
import * as vue from 'vue'
import * as vueusecore from '@vueuse/core'

import vueTippy from 'vue-tippy'
import 'tippy.js/dist/tippy.css'

//==============================================================================

import { CellDLModel } from '../viewer/model'
import { CellDLViewer } from '../viewer'

//==============================================================================

import type { SvgViewerProps, ViewerEvent } from '../index'

const props = defineProps<SvgViewerProps>()

//==============================================================================
//==============================================================================

// Get the current Vue app instance to use some PrimeVue plugins and VueTippy.

const crtInstance = vue.getCurrentInstance();

if (crtInstance) {
    const app = crtInstance.appContext.app;

    app.use(vueTippy)
}

//==============================================================================
//==============================================================================

const svgContent = vue.ref(null)

let celldlModel: CellDLModel|undefined

const celldlViewer: CellDLViewer = new CellDLViewer()

//==============================================================================

const emit = defineEmits<{
    'error': [msg: string]
    'event': [detail: ViewerEvent]
}>()

//==============================================================================

const showDiagram = async () => {
    if (props.svgData === '') {
        celldlModel = new CellDLModel(celldlViewer)
        await celldlModel.viewModel()
    } else {
        try {
            celldlModel = new CellDLModel(celldlViewer, props.svgData, props.annotations, props.options)
            await celldlModel.viewModel()
        } catch(err) {
            emit('error', `Invalid CellDL file... (${err})`)
        }
    }
}

//==============================================================================

vue.watch(
    () => props.svgData,
    async () => {
        await showDiagram()
    }
)

//==============================================================================

vue.onMounted(async () => {
    if (svgContent.value) {
        celldlViewer.mount(svgContent.value)
        await showDiagram()
    }
})

//==============================================================================

vueusecore.useEventListener(document, 'viewer-event', (event: CustomEvent) => {
    emit('event', event.detail)
})

//==============================================================================
//==============================================================================
</script>
