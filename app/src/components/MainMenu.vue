<template lang="pug">
    Menubar(ref="menuBar" :model="menuItems")
        template(#item="{ item, props, root }")
            a(v-bind="props.action")
                .p-icon(
                    v-if="item.icon !== undefined"
                    :class="item.icon"
                )
                div.p-menubar-item-label {{ item.label }}
                i.pi.pi-angle-right.ml-auto(
                    v-if="!root && item.items !== undefined"
                )
                .ml-auto.border.rounded.shortcut(
                    v-if="item.shortcut !== undefined"
                    class="text-xs/3"
                ) {{ item.shortcut }}
</template>

<script setup lang="ts">
import * as vue from 'vue'
import * as vueusecore from '@vueuse/core'

import type Menubar from 'primevue/menubar'

//==============================================================================

import * as common from '@viewer/common/common'

const isWindowsOrLinux = common.isWindows() || common.isLinux()
const isMacOs = common.isMacOs()

//==============================================================================

const props = defineProps<{
    haveFile: boolean
}>()

const emit = defineEmits([
    'about',
    'open-file',
    'close-file'
])

//==============================================================================
//==============================================================================

const menuItems = [
    {
        label: 'File',
        items: [
            {
                label: 'Open...',
                shortcut: isWindowsOrLinux ? 'Ctrl+O' : isMacOs ? '⌘O' : undefined,
                command: () => {
                    emit('open-file')
                }
            },
            {
                label: 'Close',
                shortcut: isWindowsOrLinux ? 'Ctrl+W' : isMacOs ? '⌘W' : undefined,
                command: () => {
                    emit('close-file')
                },
                disabled: () => !props.haveFile
            }
        ]
    },
    {
        label: 'Help',
        items: [
            {
                label: 'Home Page',
                command: () => {
                    window.open('https://github.com/CellDL/CellDLViewer')
                }
            },
            { separator: true },
            {
                label: 'Report Issue',
                command: () => {
                    window.open('https://github.com/CellDL/CellDLViewer/issues/new')
                }
            },
            { separator: true },
            {
                label: 'About the Model Viewer',
                command: () => {
                    emit('about')
                }
            }
        ]
    }
]

//==============================================================================

// Keyboard shortcuts.

if (common.isDesktop()) {
    vueusecore.onKeyStroke((event: KeyboardEvent) => {
        if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyW') {
            event.preventDefault()
            emit('close-file')
        } else if (common.isCtrlOrCmd(event) && !event.shiftKey && event.code === 'KeyO') {
            event.preventDefault()
            emit('open-file')
        }
    })
}

//==============================================================================

// A few things that can only be done when the component is mounted.

const menuBar = vue.ref<(vue.ComponentPublicInstance<typeof Menubar> & { hide: () => void }) | null>(null)

vue.onMounted(() => {
    if (menuBar.value !== null) {
        // Ensure that the menubar never gets the 'p-menubar-mobile' class, which would turn it into a hamburger menu.

        const menuBarElement = menuBar.value.$el as HTMLElement
        const mutationObserver = new MutationObserver(() => {
            if (menuBarElement.classList.contains('p-menubar-mobile')) {
                menuBarElement.classList.remove('p-menubar-mobile')
            }
        })

        mutationObserver.observe(menuBarElement, { attributes: true, attributeFilter: ['class'] })

        // Close the menu when clicking clicking on the menubar but outside of the main menu items.

        function onClick(event: MouseEvent) {
            const target = event.target as Node

            if (
                menuBarElement.contains(target) &&
                !menuBarElement.querySelector('.p-menubar-root-list')?.contains(target) &&
                !Array.from(document.querySelectorAll('.p-menubar-submenu')).some((submenu) => submenu.contains(target))
            ) {
                menuBar.value?.hide()
            }
        }

        document.addEventListener('click', onClick)

        // Clean up the mutation observer and event listener when the component is unmounted.

        vue.onBeforeUnmount(() => {
            mutationObserver.disconnect()

            document.removeEventListener('click', onClick)
        })
    }
})

//==============================================================================

</script>

<style scoped>
.p-menubar {
  padding: 0.1rem;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--border-color);
}

.p-menubar
  > .p-menubar-root-list
  > .p-menubar-item
  > .p-menubar-item-content
  > .p-menubar-item-link
  .p-menubar-submenu-icon {
  display: none;
}

:deep(.p-menubar-submenu .p-menubar-item-link:hover:not(:has(.p-menubar-submenu))) {
  border-radius: var(--p-menubar-item-border-radius);
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

:deep(.p-menubar-submenu .p-menubar-item-link:hover:not(:has(.p-menubar-submenu)) .shortcut) {
  border-color: var(--p-primary-contrast-color);
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

:deep(.p-menubar-submenu .p-menubar-item-link:hover:not(:has(.p-menubar-submenu)) > .p-menubar-submenu-icon) {
  color: var(--p-primary-contrast-color) !important;
}

.p-menubar-item-link {
  padding: 0.25rem 0.5rem !important;
}

:deep(.p-menubar-root-list) {
  gap: 0.1rem;
}

:deep(.p-menubar-submenu) {
  padding: 0.1rem;
  z-index: 10;
}

.shortcut {
  border-color: var(--p-content-border-color);
  background: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
}
</style>
