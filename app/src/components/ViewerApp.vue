<template lang="pug">
    BlockUI.overflow-hidden
        .h-dvh.flex.flex-col
            .flex
                MainMenu(
                    :haveFile="haveFile"
                    @about="onAboutMenu"
                    @open-file="onOpenFile"
                    @close-file="onCloseFile"
                )
                div.flex-grow.text-center.font-bold {{ windowTitle }}
            CellDLViewer.grow(
                :annotations="annotations"
                :celldlData="celldlData"
                :theme="theme"
                @error="onError"
                @event="onEvent"
            )
            AboutDialog(
                v-model:visible="aboutVisible"
                @close="aboutVisible = false"
            )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import 'primeicons/primeicons.css'

import primeVueAuraTheme from '@primeuix/themes/aura'
import primeVueConfig from 'primevue/config'

//==============================================================================

import '../assets/app.css'

import AboutDialog from './AboutDialog.vue'

import CellDLViewer from '../../../index'
import type { Annotations, Theme, ViewerEvent } from '../../../index'

import * as vueCommon from '@viewer/common/vueCommon'

//==============================================================================

const props = defineProps<{
    theme?: Theme
}>()

//==============================================================================

// Setup PrimeVue's theme

const crtInstance = vue.getCurrentInstance();

if (crtInstance) {
    const app = crtInstance.appContext.app;

    if (!app.config.globalProperties.$primevue) {
        app.use(primeVueConfig as unknown as vue.Plugin, {
            theme: {
                preset: primeVueAuraTheme,
                options: {
                    darkModeSelector: '.celldl-dark-mode'
                }
            }
        })
    }
}

vueCommon.useTheme().setTheme(props.theme)
}

//==============================================================================
//==============================================================================

const annotations = vue.ref<Annotations>({})

const celldlData = vue.ref<string>('')

const windowTitle = vue.ref<string>('')

let currentFileHandle: FileSystemFileHandle|undefined
const haveFile = vue.ref<boolean>(false)

//==============================================================================

async function onOpenFile() {
    const options = {
        excludeAcceptAllOption: true,
        types: [
            {
                description: 'CellDL files',
                accept: {
                    'image/svg+xml': ['.celldl', '.svg'],
                }
            }
        ]
    }
    const fileHandles = await window.showOpenFilePicker(options)
    if (fileHandles.length) {
        currentFileHandle = fileHandles[0]
        if (currentFileHandle) {
            const file = await currentFileHandle.getFile()
            const contents = await file.text()
            celldlData.value = contents
            haveFile.value = true
            windowTitle.value = currentFileHandle.name
        }
    }
}

//==============================================================================

function onCloseFile() {
    currentFileHandle = undefined
    celldlData.value = ''
    haveFile.value = false
    windowTitle.value = ''
}

//==============================================================================
//==============================================================================

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

function onAboutMenu(): void {
  aboutVisible.value = true
}

//==============================================================================

function onError(msg: string) {
    window.alert(msg)
}

function onEvent(detail: ViewerEvent) {
    console.log(detail)
}

//==============================================================================
//==============================================================================
</script>
