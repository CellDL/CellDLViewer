<template lang="pug">
    .flex.flex-col.h-full
        main.viewer-pane.relative.flex.grow
            div#svg-content(ref="svgContent")
</template>

<script setup lang="ts">
import * as vue from 'vue'

import primeVueAuraTheme from '@primeuix/themes/aura'
import primeVueConfig from 'primevue/config'

import vueTippy from 'vue-tippy'
import 'tippy.js/dist/tippy.css'

//==============================================================================

import '@viewer/assets/style.css'

import * as vueCommon from '@viewer/common/vueCommon'
import { CellDLModel } from '@viewer/viewer/model'
import { CellDLViewer } from '@viewer/viewer'

//==============================================================================

import type { CellDLViewerProps } from '../../index'

const props = defineProps<CellDLViewerProps>()

//==============================================================================
//==============================================================================

// Get the current Vue app instance to use some PrimeVue plugins and VueTippy.

const crtInstance = vue.getCurrentInstance()

if (crtInstance !== null) {
    const app = crtInstance.appContext.app

    if (app.config.globalProperties.$primevue === undefined) {
        let options = {}

        if (props.theme === 'light') {
            options = {
                darkModeSelector: false
            }
        } else if (props.theme === 'dark') {
            document.documentElement.classList.add('viewer-dark-mode')
            document.body.classList.add('viewer-dark-mode')

            options = {
                darkModeSelector: '.viewer-dark-mode'
            }
        }

        app.use(primeVueConfig as unknown as vue.Plugin, {
            theme: {
                preset: primeVueAuraTheme,
                options: options
            }
        })

    }

    // Setup VueTippy

    app.use(vueTippy)

}

if (props.theme !== undefined) {
    vueCommon.useTheme().setTheme(props.theme)
}

//==============================================================================
//==============================================================================

const svgContent = vue.ref(null)

let celldlModel: CellDLModel|undefined

const celldlViewer: CellDLViewer = new CellDLViewer()

//==============================================================================

const emit = defineEmits<{
    'error': [msg: string]
}>()

//==============================================================================

vue.watch(
    () => props.celldlData,
    async () => {
        if (props.celldlData === '') {
            celldlModel = new CellDLModel('', {}, celldlViewer)
            await celldlModel.viewModel()
        } else {
            try {
                celldlModel = new CellDLModel(props.celldlData, props.annotation, celldlViewer)
                await celldlModel.viewModel()
            } catch(err) {
                emit('error', `Invalid CellDL file... (${err})`)
            }
        }
    }
)

//==============================================================================

vue.onMounted(async () => {

    if (svgContent.value) {
        celldlViewer.mount(svgContent.value)

        // Create a new model in the viewer's window
        celldlModel = new CellDLModel('', {}, celldlViewer)

        await celldlModel.viewModel()
    }
})

//==============================================================================
//==============================================================================
</script>

<style scoped>
.viewer-pane {
    min-height: 100%;
}
#svg-content {
    margin:  0;
    border: 2px solid grey;
    flex: 1;
    overflow: hidden;
}
</style>
