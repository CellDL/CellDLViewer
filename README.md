# The CellDL Model Viewer

The **CellDL Model Viewer** can be:

1. Run as a standalone application in a Web browser (currently Chrome and Edge) to view CellDL files.
2. Integrated into a web application as a [Vue 3](https://vuejs.org/) component.

## As a Vue 3 component

### Installation:

```bash
npm install @celldl/viewer
```

### Usage:

- **index.html:**

The `Content-Security-Policy` **must** allow `data:` connections and Web Assembly to be evaluated, for instance:

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

- **App.vue:**

> **Note:**
> No styles, including defining a width and height, are applied to the CellDLViewer component, as this is expected to be provided by parent component(s). If the component has zero width or height an error is logged and no content is shown.


```vue
<template>
  <CellDLViewer
    :annotations="annotations"
    :celldlData="celldlData"
    :theme="theme"
    @error="onError"
    @event="onEvent"
  />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import '@celldl/viewer/style.css';

import CellDLViewer from '@celldl/viewer'
import type { Annotations, Theme, ViewerEvent } from '@celldl/viewer'

const annotations = vue.ref<Annotations>({})

const celldlData = vue.ref<string>('')

function onError(msg: string) {
  window.alert(msg);
}

function onEvent(detail: ViewerEvent) {
    console.log(detail)
}
</script>
```

The viewer is initialised with a blank window; to load a CellDL diagram set `celldlData.value` to valid CellDL.

Events are generated in response to pointer events on the diagram's features; a `ViewerEvent` event has a `type` of event, the `id` of the feature, and any annotations associated with the feature that were provided to the viewer by `annotations.value`.

The set of annotations for a diagram is a JSON object in the form:

```
{
    "FEATURE_ID": {
        "PROPERTY": "VALUE",
        ...
    },

    ...
}
```
