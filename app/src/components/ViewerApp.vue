<template lang="pug">
    BlockUI.overflow-hidden
        BackgroundComponent(
            v-show="loadingMessage !== ''"
        )
        BlockingMessageComponent(
            :message="loadingMessage"
            v-show="loadingMessage !== ''"
        )
        .h-dvh.flex.flex-col
            .flex
                MainMenu(
                    :haveFile="haveFile"
                    :fileModified="fileModified"
                    :editorState="editorState"
                    :noPython="noPython"
                    :viewState="viewState"
                    @about="onAboutMenu"
                    @edit-action="onEditAction"
                    @export-action="onExportAction"
                    @file-action="onFileAction"
                    @view-action="onViewAction"
                )
                div.flex-grow.text-center.font-bold {{ windowTitle }}
            ConfirmDialog
            CellDLEditor.grow(
                :editorCommand="editorCommand"
                @editorData="onEditorData"
                @error="onError"
            )
            AboutDialog(
                v-model:visible="aboutVisible"
                @close="aboutVisible = false"
            )
            Dialog.issues(
                v-model:visible="issuesVisible"
            )
                template(#header)
                    .flex.w-full
                        p.text-2xl.font-bold Issues generating CellML:
                        .grow
                        Button(
                            icon="pi pi-copy"
                            title="Copy to clipboard"
                            @click="copyIssuesToClipboard"
                        )
                div
                    p.mb-1(
                        v-for="issue in issues"
                    ) {{ issue }}
</template>

<script setup lang="ts">
import * as vue from 'vue'
import * as vueusecore from '@vueuse/core'

import 'primeicons/primeicons.css'

import primeVueAuraTheme from '@primeuix/themes/aura'
import primeVueConfig from 'primevue/config'

//==============================================================================

import '../assets/app.css'

import AboutDialog from './dialogs/AboutDialog.vue'

import CellDLViewer from '../../../index'

import * as vueCommon from '@viewer/common/vueCommon'

//==============================================================================

const props = defineProps<{
    theme?: string
}>()

//==============================================================================

// Setup PrimeVue's theme and confirmation service

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
            document.documentElement.classList.add('editor-dark-mode')
            document.body.classList.add('editor-dark-mode')

            options = {
                darkModeSelector: '.editor-dark-mode'
            }
        }

        app.use(primeVueConfig as unknown as vue.Plugin, {
            theme: {
                preset: primeVueAuraTheme,
                options: options
            }
        })
    }
}

if (props.theme !== undefined) {
    vueCommon.useTheme().setTheme(props.theme)
}

//==============================================================================
//==============================================================================

//==============================================================================

const windowTitle = vue.ref<string>('New file')

let currentFileHandle: FileSystemFileHandle|undefined

//==============================================================================

//==============================================================================

function onError(msg: string) {
    window.alert(msg)
}

//==============================================================================
//==============================================================================

async function onFileAction(action: string) {
    if (action === 'open') {
        await onOpenFile()
    } else if (action === 'close') {
        await onCloseFile()
    }
}

//==============================================================================
//==============================================================================

async function onOpenFile() {
    if (!fileStatus.value.modified) {
        await openFile()
    } else {
        confirm.require({
            message: 'Overwrite modified file?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            rejectProps: {
                label: 'Cancel',
                severity: 'secondary',
                outlined: true
            },
            acceptProps: {
                label: 'Open'
            },
            accept: async () => {
                await openFile()
            }
        })
    }
}

async function openFile() {
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
            editorCommand.value = {
                command: 'file',
                options: {
                    action: 'open',
                    data: contents,
                    name: currentFileHandle.name
                }
            }
            fileStatus.value.haveData = true
            windowTitle.value = currentFileHandle.name
        }
    }
}

//==============================================================================

function onCloseFile() {
    editorCommand.value = {
        command: 'file',
        options: {
            action: 'close'
        }
    }
    currentFileHandle = undefined
    fileStatus.value.haveData = false
    windowTitle.value = 'New file'
}

//==============================================================================
//==============================================================================

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

function onAboutMenu(): void {
  aboutVisible.value = true
}

//==============================================================================
//==============================================================================

</script>
