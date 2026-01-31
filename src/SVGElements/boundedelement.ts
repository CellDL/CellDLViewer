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

import type { CellDLObject } from '@viewer/celldlObjects'
import { RestrictedPoint } from '@viewer/geometry'
import { ControlRect } from '@viewer/geometry/controls'

import { CellDLSVGElement } from '.'

//==============================================================================

export class BoundedElement extends CellDLSVGElement {
    #controlRect: ControlRect

    constructor(object: CellDLObject, svgElement: SVGGraphicsElement) {
        super(object, svgElement)
        // local transform on the element
        this.#controlRect = new ControlRect(
            RestrictedPoint.fromPoint(this.topLeft),
            RestrictedPoint.fromPoint(this.topLeft.add(this.size)),
            this.centroidOffset
        )
        this.setCentroid(this.#controlRect.centroid.point)
    }
}

//==============================================================================
