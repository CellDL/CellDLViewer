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

import { Point, PointMath } from '@viewer/common/points'
import { svgRect } from '@viewer/common/svgUtils'
import type { StringProperties } from '@viewer/common/types'
import { FixedPoint, FixedValue } from '@viewer/geometry'

import { RestrictedPoint } from '.'

//==============================================================================

export class ControlRect {
    #topLeft!: RestrictedPoint
    #bottomRight!: RestrictedPoint
    #size!: Point
    #centroid!: RestrictedPoint
    #centroidOffset!: Point
    #svgElement: SVGRectElement | null = null

    constructor(corner_0: RestrictedPoint, corner_1: RestrictedPoint, centroidOffset: Point | null = null) {
        this.setCornerPositions(corner_0, corner_1)
        this.setCentroidOffset(centroidOffset || new Point(0.5, 0.5))
    }

    get centroid() {
        return this.#centroid
    }

    get dirty() {
        return this.#topLeft.dirty || this.#bottomRight.dirty
    }

    get fixed() {
        return this.#topLeft.fixed && this.#bottomRight.fixed
    }

    get svgElement() {
        return this.#svgElement
    }

    get topLeftPoint() {
        return this.#topLeft.point
    }

    clean() {
        this.#topLeft.clean()
        this.#bottomRight.clean()
    }

    copy(): ControlRect {
        return new ControlRect(this.#topLeft, this.#bottomRight, this.#centroidOffset)
    }

    setCornerPositions(corner_0: RestrictedPoint, corner_1: RestrictedPoint) {
        let x0 = corner_0.xValue,
            y0 = corner_0.yValue
        let x1 = corner_1.xValue,
            y1 = corner_1.yValue
        if (x0.value > x1.value) {
            x0 = corner_1.xValue
            x1 = corner_0.xValue
        }
        if (y0.value > y1.value) {
            y0 = corner_1.yValue
            y1 = corner_0.yValue
        }
        this.#topLeft = new RestrictedPoint(x0, y0)
        this.#bottomRight = new RestrictedPoint(x1, y1)
        this.#size = PointMath.subtract(this.#bottomRight.point, this.#topLeft.point)
    }

    setCentroidOffset(centroidOffset: Point) {
        this.#centroidOffset = centroidOffset
        this.#centroid = RestrictedPoint.fromPoint(this.#size.scale(this.#centroidOffset).add(this.#topLeft.point))
    }

    svg(attributes: StringProperties = {}) {
        return svgRect(this.#topLeft.point, this.#bottomRight.point, attributes)
    }
}

//==============================================================================

export class FixedControlRect extends ControlRect {
    constructor(bounds: [number, number, number, number]) {
        super(
            new FixedPoint(new FixedValue(bounds[0]), new FixedValue(bounds[1])),
            new FixedPoint(new FixedValue(bounds[2]), new FixedValue(bounds[3]))
        )
    }
}

//==============================================================================
//==============================================================================
