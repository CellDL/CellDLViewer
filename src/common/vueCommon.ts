//==============================================================================
//
// From https://github.com/agarny/webapp/blob/main/src/renderer/src/common/vueCommon.ts
//
//==============================================================================

import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import type { Theme } from '../../index.ts';

// A constant to know the UID of the active instance of OpenCOR.

export const activeInstanceUid = vueusecore.createGlobalState(() => vue.ref<string | null>(null));

// Theme composable to know whether OpenCOR uses light mode, dark mode, or system mode.

export const useTheme = vueusecore.createGlobalState(() => {
  const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)');
  const isLightMode = vue.ref(prefersColorScheme.matches);
  const isDarkMode = vue.ref(!prefersColorScheme.matches);
  const _theme = vue.ref<Theme>('system');

  function updateLightAndDarkModes(prefersColorScheme: MediaQueryList | MediaQueryListEvent) {
    isLightMode.value = prefersColorScheme.matches;
    isDarkMode.value = !prefersColorScheme.matches;
  }

  function updateDocumentClasses() {
    document.documentElement.classList.toggle('celldl-dark-mode', isDarkMode.value);
  }

  prefersColorScheme.addEventListener('change', (event) => {
    if (_theme.value === 'system') {
      updateLightAndDarkModes(event);
      updateDocumentClasses();
    }
  });

  function theme(): Theme {
    return _theme.value;
  }

  function setTheme(newTheme: Theme | undefined) {
    _theme.value = newTheme ?? 'system';

    if (_theme.value === 'light') {
      isLightMode.value = true;
      isDarkMode.value = false;
    } else if (_theme.value === 'dark') {
      isLightMode.value = false;
      isDarkMode.value = true;
    } else {
      updateLightAndDarkModes(prefersColorScheme);
    }

    updateDocumentClasses();
  }

  function useLightMode(): boolean {
    return isLightMode.value;
  }

  function useDarkMode(): boolean {
    return isDarkMode.value;
  }

  return {
    theme,
    setTheme,
    useLightMode,
    useDarkMode
  };
});

//==============================================================================
//==============================================================================
