# The CellDL Model Viewer

There are two versions of the Viewer:

1. **The CellDL Editor:** a desktop application that can be run on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors)-based and [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family)-based [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS) machines; and
2. **The CellDL Viewers's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run on a Web browser.

This package is a [Vue 3](https://vuejs.org/) component for the CellDL Editor, built with the [Composition API](https://vuejs.org/guide/extras/composition-api-faq).

## Usage

The component comes with the following props:

**TODO**

and emits the following actions:

**TODO**

- **index.html:**

The `Content-Security-Policy` **must** allow `data:` connections and Wasm to be evaluated, for instance:

```html
    <meta
      http-equiv="Content-Security-Policy"
      content="connect-src * data:; script-src 'self' 'wasm-unsafe-eval'" />
```

- **main.ts:**

```typescript
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
```

The Vue component gives access to all of the CellDL Editor's features

- **App.vue:**

```vue
<template>
  <CellDLEditor
    :editorCommand="celldlEditorCommand"
    @editorData="onEditorData"
    @error="onError" />
</template>

<script setup lang="ts">
import type { CellDLEditorCommand, EditorData } from '@abi-software/celldl-editor';
import '@abi-software/celldl-editor/style.css';
import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import CellDLEditor from '@abi-software/celldl-editor'

const celldlEditorCommand = vue.ref<CellDLEditorCommand>({
  command: ''
});

vueusecore.useEventListener(document, 'file-edited', (_: Event) => {
  // The current diagram has has been modified, so update any local state (e.g., add a modified indicator to the
  // diagram's title).
});

async function onEditorData(data: EditorData) {
  if (data.kind === 'export') {
    // const uri = 'https://example.org/some_uri_to_identify_the_celldl_source_';
    // const cellmlObject = celldl2cellml(uri, data.data);
    // if (cellmlObject.cellml) {
    //   // Save `cellmlObject.cellml`.
    // } else if (cellmlObject.issues) {
    //   window.alert(cellmlObject.issues.join('\n'));
    // }
  } else {
    // Process `data.data`.
  }
}

function onError(msg: string) {
  window.alert(msg);
}

/*
The editor is initialised with a blank window.

1. To load a CellDL diagram set:

  celldlEditorCommand.value = {
    command: 'file',
    options: {
      action: 'open',
      data: celldlSource,
      name: filename
    }
  }

2. To get serialised CellDL from the editing window set:

  celldlEditorCommand.value = {
    command: 'file',
    options: {
      action: 'data',
      kind: 'export'
    }
  }

with `kind` set as appropriate. This will result in an `editorData` event, to be handled as above.

3. To clear the editing window set:

  celldlEditorCommand.value = {
    command: 'file',
    options: {
      action: 'close'
    }
  }
*/
</script>```
