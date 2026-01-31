//==============================================================================
//
// From https://github.com/agarny/webapp/blob/main/src/renderer/src/common/vueCommon.ts
//
//==============================================================================

import * as vue from 'vue'

import type { Theme } from '../../index'

// Theme composable to know whether the CellDL Model Viewer uses light mode or dark mode.

export function useTheme() {
    const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)')
    const isLightMode = vue.ref(prefersColorScheme.matches)
    const isDarkMode = vue.ref(!prefersColorScheme.matches)
    let theme: Theme = 'system'

    function onChange(event: { matches: boolean }) {
        if (theme === 'system') {
            isLightMode.value = event.matches
            isDarkMode.value = !event.matches
        }
    }

    vue.onMounted(() => {
        prefersColorScheme.addEventListener('change', onChange)
    })

    vue.onUnmounted(() => {
        prefersColorScheme.removeEventListener('change', onChange)
    })

    function setTheme(newTheme: Theme) {
        theme = newTheme

        if (theme === 'light') {
            isLightMode.value = true
            isDarkMode.value = false
        } else if (theme === 'dark') {
            isLightMode.value = false
            isDarkMode.value = true
        }
    }

    function useLightMode(): boolean {
        return isLightMode.value
    }

    function useDarkMode(): boolean {
        return isDarkMode.value
    }

    return {
        setTheme,
        useLightMode,
        useDarkMode
    }
}

//==============================================================================
//==============================================================================
