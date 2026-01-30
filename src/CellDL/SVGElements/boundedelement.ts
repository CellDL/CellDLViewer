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

import { CELLDL_CLASS, type CellDLConnectedObject, type CellDLObject } from '@editor/celldlObjects/index'
import { Point, type PointLike } from '@renderer/common/points'
import { RestrictedPoint, type RestrictedValue } from '@editor/geometry/index'
import { Transform } from '@editor/geometry/transforms'

import { CellDLSVGElement } from './index'

//==============================================================================

export class BoundedElement extends CellDLSVGElement {
    // Selected object is stroked bounding box rectangle with control points at each corner
    // Control point move resizes (shift maintains aspect ratio if object doesn't have fixed
    // aspect ratio property).
    // Bounding box grab moves entire object.
    // Rotate via double click on a control point? Cursor to change to show rotate mode; click exits rotate mode.
    // svgElement could be a group.
    // connector nodes on object move with the object (==> need their position wrt. bbox (centre origin, so rotate works?))

    #connectedPathElements: Map<string, PathElement> = new Map()
    #controlRect: ControlRect
    #topLeftCorner: Point
    #transform: Transform

    constructor(object: CellDLObject, svgElement: SVGGraphicsElement, gridAligned: boolean=false, align: boolean=false) {
        super(object, svgElement)
        // local transform on the element
        this.#transform = Transform.fromString(getComputedStyle(svgElement).transform)
        this.#controlRect = new ControlRect(
            RestrictedPoint.fromPoint(this.topLeft),
            RestrictedPoint.fromPoint(this.topLeft.add(this.size)),
            this.centroidOffset
        )
        this.setCentroid(this.#controlRect.centroid.point)
        this.#topLeftCorner = this.#controlRect.topLeftPoint
        this.#controlRect.gridAligned = gridAligned
        if (gridAligned && align) {
            const gridAlignedCentroid = editGuides.gridAlign(this.centroid, { fullSnap: true })
            this.#reposition(gridAlignedCentroid)
        }
    }

    limitDirection(direction: string, minimum: number | RestrictedValue, maximum: number | RestrictedValue) {
        if (direction === 'H') {
            this.#controlRect.centroid.xValue.narrowRange(minimum, maximum)
        } else if (direction === 'V') {
            this.#controlRect.centroid.yValue.narrowRange(minimum, maximum)
        }
    }

    unlimitDirection() {
        this.#controlRect.centroid.xValue.reassignMinimum(-Infinity)
        this.#controlRect.centroid.xValue.reassignMaximum(Infinity)
        this.#controlRect.centroid.yValue.reassignMinimum(-Infinity)
        this.#controlRect.centroid.yValue.reassignMaximum(Infinity)
    }

    redraw() {
        const newTopLeft = this.#controlRect.topLeftPoint
        const translation = Transform.Translate(
            newTopLeft.x - this.#topLeftCorner.x,
            newTopLeft.y - this.#topLeftCorner.y
        )
        let transform: Transform
        if (this.globalTransform) {
            const globalInverse = this.globalTransform.inverse()
            const globalTransform = this.updateGlobalTransform(translation)
            if (globalTransform) {
                transform = globalTransform.leftMultiply(globalInverse).leftMultiply(this.#transform)
            } else {
                transform = globalInverse.leftMultiply(this.#transform)
            }
        } else {
            this.updateGlobalTransform(translation)
            transform = translation.leftMultiply(this.#transform)
        }
        if (transform.isIdentity) {
            this.svgElement.removeAttribute('transform')
        } else {
            this.svgElement.setAttribute('transform', transform.toString())
        }
        super.redraw()
    }

    #reposition(centroid: Point) {
        this.setCentroid(centroid)
        this.#controlRect.reposition(centroid)
        if (this.#controlRect.dirty) {
            this.redraw()
        }
    }

    async updateSvgElement(svg: string) {
        const savedCorners = this.corners.map((point) => Point.fromPoint(point))
        await super.updateSvgElement(svg)
        this.#controlRect.setCentroidOffset(this.centroidOffset)
        this.#controlRect.setCornerPositions(
            RestrictedPoint.fromPoint(this.topLeft),
            RestrictedPoint.fromPoint(this.topLeft.add(this.size))
        )
        const cornerDeltas = this.corners.map((corner, index) => corner.subtract(savedCorners[index]!))
        if (this.celldlObject.isConnectable) {
            // Reset any restrictions for `componentBoundingBoxResisized()`
            this.unlimitDirection()
            // Adjust boundary intersections of paths connected to the component
            for (const path of this.#connectedPathElements.values()) {
                path.componentBoundingBoxResisized(this, cornerDeltas as [Point, Point])
            }
            ;(<CellDLConnectedObject>this.celldlObject).connections.forEach((c) => c.redraw())
        }
    }
}

//==============================================================================
