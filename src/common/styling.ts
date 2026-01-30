/******************************************************************************

CellDL Model Viewer

Copyright (c) 2022 - 2025 David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

******************************************************************************/

import { EM_SIZE } from '@editor/geometry/units'

//==============================================================================

export const CONNECTION_ARROW_SIZE = [4, 4] // [W, H] pixels
export const CONNECTION_SPLAY_PADDING = 16 // If <= 1.0 then fraction of elements width and height else pixels
export const MAX_CONNECTION_SPLAY_PADDING = 20 // pixels

export const CONNECTION_COLOUR = '#334155'
export const CONNECTION_WIDTH = 2 // pixels
export const CONNECTION_DASH = 2  // * width

export const INTERFACE_PORT_RADIUS = 4 // pixels
export const SELECTION_STROKE_WIDTH = 3 // pixels

//==============================================================================

export const CELLDL_BACKGROUND_CLASS = 'celldl-background'

//==============================================================================

export function arrowMarkerDefinition(markerId: string, markerType: string): string {
    // see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
    const W = 1
    return `<marker id="${markerId}" viewBox="0 0 ${5.5 * W} ${5 * W}" class="${markerType}"
        refX="${5 * W}" refY="${2.5 * W}" orient="auto-start-reverse" markerUnits="strokeWidth"
        markerWidth="${CONNECTION_ARROW_SIZE[0]}" markerHeight="${CONNECTION_ARROW_SIZE[1]}">
            <path fill="context-stroke" stroke="context-stroke" d="M0,0 L${5.05 * W},${2.2 * W} L${5.05 * W},${2.8 * W} L0,${5 * W} L${W},${2.5 * W} z" />
        </marker>`
}

//==============================================================================

export type GradientStop = {
    offset: string
    colour: string
}

export function gradientDefinition(type: string, gradientId: string, stops: GradientStop[]): string {
    return `<${type}Gradient id="${gradientId}">${stops
        .map((def) => `<stop offset="${def.offset}" stop-color="${def.colour}" />`)
        .join('\n    ')}</${type}Gradient>`
}

//==============================================================================

export const CellDLStylesheet = [
    `svg{font-size:${EM_SIZE}px}`,
    /* Conduits */
    '.celldl-Conduit{z-index:9999}',
    /* Connections */
    `.celldl-Connection{stroke-linejoin:round;fill:none}`,
    /* Compartments */
    '.celldl-Compartment>rect.compartment{fill:#CCC;opacity:0.6;stroke:#444;rx:10px;ry:10px}',
    /* Interfaces */
    `.celldl-InterfacePort{fill:red;r:${INTERFACE_PORT_RADIUS}px}`,
    `.celldl-Unconnected{fill:red;fill-opacity:0.1;stroke:red;r:${INTERFACE_PORT_RADIUS}px}`
].join('')

//==============================================================================
