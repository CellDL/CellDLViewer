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

export const EM_SIZE = 16 // Pixels, sets ``font-size`` in CellDLStylesheet
export const EX_SIZE = EM_SIZE / 2

const CM_PER_INCH = 2.54
const MM_PER_INCH = 10 * CM_PER_INCH

const POINTS_PER_INCH = 72
const PICAS_PER_INCH = 6
const PIXELS_PER_INCH = 96

//==============================================================================

const __unit_scaling: Map<string, number | null> = new Map([
    ['px', 1],
    ['in', PIXELS_PER_INCH],
    ['cm', PIXELS_PER_INCH / CM_PER_INCH],
    ['mm', PIXELS_PER_INCH / MM_PER_INCH],
    ['pt', PIXELS_PER_INCH / POINTS_PER_INCH],
    ['pc', PIXELS_PER_INCH / PICAS_PER_INCH],
    ['%', null], // 1/100.0 of viewport dimension
    ['em', EM_SIZE], // em/pt depends on current font size
    ['ex', EX_SIZE] // ex/pt depends on current font size
])

const __unit_length_re = /(.*)(em|ex|px|in|cm|mm|pt|pc|%)/

export function lengthToPixels(length: string | number | null): number | null {
    if (typeof length !== 'string') {
        return length
    }
    const match = length.match(__unit_length_re)
    if (match === null || match.length < 3) {
        return +length
    } else {
        // @ts-expect-error:
        const scaling = __unit_scaling.get(match[2])
        if (scaling !== null && scaling !== undefined) {
            // @ts-expect-error:
            return scaling * +match[1]
        }
    }
    return null
}

export function pixelsToLength(pixels: string | number, units: string): string | null {
    const scaling = __unit_scaling.get(units)
    if (scaling !== null && scaling !== undefined) {
        return `${Math.round((+pixels * 1000) / scaling) / 1000}${units}`
    }
    return null
}

//==============================================================================
