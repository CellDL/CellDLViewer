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

import type { Pair } from '@viewer/common/types'

//==============================================================================

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

//==============================================================================

export function round(length: number, decimalPlaces: number = 3): number {
    const tenPower = 10 ** decimalPlaces
    return Math.round(tenPower * length) / tenPower
}

export function roundEqual(l1: number, l2: number, decimalPlaces: number = 3): boolean {
    const tenPower = 10 ** decimalPlaces
    return Math.round(tenPower * l1) / tenPower === Math.round(tenPower * l2) / tenPower
}

//==============================================================================

export function* range(startOrStop: number, stop: number | null = null, step: number | null = null) {
    if (stop === null) {
        stop = startOrStop
        startOrStop = 0
    }
    if (step === null) {
        step = 1
    }
    for (let x = startOrStop; x < stop; x += step) {
        yield x
    }
}

//==============================================================================

// From https://stackoverflow.com/a/65064026

export function pairwise<T>(a: T[]): Pair<T>[] {
    return a.flatMap((x: T) => {
        return a.flatMap((y: T): Pair<T>[] => {
            return x !== y ? [[x, y]] : []
        })
    })
}

//==============================================================================
