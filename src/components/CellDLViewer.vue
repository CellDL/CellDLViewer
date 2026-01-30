<template lang="pug">
    .flex.flex-col.h-full
        main.viewer-pane.relative.flex.grow
            div#svg-content(ref="svgContent")
                <!-- context-menu(id="context-menu")  -->
        footer.status-bar
            span#status-msg
            span#status-pos
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
import { CellDLViewer } from '@viewer/viewer/index'

//==============================================================================

import type {
    CellDLViewerProps,
    ViewerData,
    EditorEditCommand,
    EditorFileCommand,
    EditorViewCommand
} from '../../index'

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

let celldlViewer: CellDLViewer = new CellDLViewer()

//==============================================================================
//==============================================================================

const emit = defineEmits<{
    'viewer-data': [data: EditorData],
    'error': [msg: string]
}>()

vue.watch(
    () => props.editorCommand,
    async () => {
        if (props.editorCommand.command === 'file') {
            const command = props.editorCommand as EditorFileCommand
            const options = command.options
            if  (options.action === 'close') {
                celldlModel = new CellDLModel('', '', celldlViewer)
                await celldlViewer.viewModel(celldlModel)
            } else if (options.action === 'open') {
                if (options.data !== undefined) {
                    try {
                        celldlModel = new CellDLModel(options?.name || '', options.data, celldlViewer)
                        await celldlViewer.viewModel(CellDLModel)
                    } catch(err) {
                        emit('error', `Cannot open ${options?.name} -- invalid CellDL file?`)
                    }
                }
            }
        }
    }
)

//==============================================================================

vue.onMounted(async () => {

    if (svgContent.value) {
        celldlViewer.mount(svgContent.value)

        // Create a new model in the viewer's window
        celldlModel = new CellDLModel('', '', celldlViewer)

        await celldlModel.view()
    }
})

//==============================================================================
//==============================================================================
</script>

<style scoped>
.viewer-pane {
    min-height: calc(100% - 1.6em);
}
#svg-content {
    margin:  0;
    border: 2px solid grey;
    flex: 1;
    overflow: hidden;
}
.status-bar {
    min-height: 1.6em;
    border-top: 1px solid gray;
    padding-left: 16px;
    padding-right: 16px;
    background-color: #ECECEC;
}
#status-msg.error {
    color: red;
}
#status-msg.warn {
   color: blue;
}
#status-pos {
    float: right;
}
</style>
