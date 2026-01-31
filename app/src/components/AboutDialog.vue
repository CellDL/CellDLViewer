<template lang="pug">
    Dialog(
        :modal="true"
        appendTo="self"
        :pt:mask:style="{ position: 'absolute' }"
    )
        div(class="text-2xl font-bold") CellDL Model Viewer
        div.text-xs Copyright (c) 2022 - 2025 David Brooks
        div.text Version {{ version }}
</template>

<script setup lang="ts">
defineEmits<(event: 'close') => void>()

import { version } from '../../../package.json'
</script>
