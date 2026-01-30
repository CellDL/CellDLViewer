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

import { Point, type PointLike, PointMath } from '@renderer/common/points'

import { CELLDL_CLASS, type CellDLObject } from '@editor/celldlObjects/index'
import { Bounds, type RestrictedValue } from '@editor/geometry/index'
import { FixedControlRect } from '@editor/geometry/controls'
import { Transform } from '@editor/geometry/transforms'

//==============================================================================

export class CellDLSVGElement {
    #bounds!: Bounds
    #centroid!: Point
    #centroidOffset: Point = new Point(0.5, 0.5)
    #cornerOffsets!: [Point, Point, Point, Point] // Wrt centroid, anticlockwise from bottom right
    #selected: boolean = false
    #selectionClasses: Set<string> = new Set()
    #selectionElement: SVGGraphicsElement
    #size: Point = new Point()
    #svgElement: SVGGraphicsElement
    #topLeft!: Point
    #globalTransform: Transform | null = null

    constructor(
        readonly celldlObject: CellDLObject,
        svgElement: SVGGraphicsElement | null
    ) {
        if (svgElement === null) {
            throw new Error(`CellDL object '${celldlObject.id}' isn't represented in SVG...`)
        }
        const svgDiagramElement = celldlObject.celldlModel?.svgDiagram
        // get all transformations that are being applied to the SVG element
        this.#globalTransform = Transform.Identity()
        let element = svgElement
        while (element !== svgDiagramElement) {
            const transform = getComputedStyle(element).transform
            if (transform !== 'none') {
                this.#globalTransform = this.#globalTransform.leftMultiply(Transform.fromString(transform))
            }
            element = element.parentNode as SVGGraphicsElement
        }
        if (this.#globalTransform.isIdentity) {
            this.#globalTransform = null
        }
        celldlObject.setCelldlSvgElement(this)
        this.#svgElement = svgElement
        this.#selectionElement = svgElement
    }

    get bounds(): Bounds {
        return this.#bounds
    }

    get centroid(): Point {
        return this.#centroid
    }

    get centroidOffset(): Point {
        return this.#centroidOffset
    }

    get corners(): [Point, Point] {
        return [this.#cornerOffsets[0], this.#cornerOffsets[2]]
    }

    get globalTransform() {
        return this.#globalTransform
    }

    get height(): number {
        return this.#size.y
    }

    get id(): string {
        return this.celldlObject.id
    }

    get moveable() {
        return false
    }

    get selected() {
        return this.#selected
    }

    get size() {
        return this.#size
    }

    get svgElement() {
        return this.#svgElement
    }

    get topLeft() {
        return this.#topLeft
    }

    get width(): number {
        return this.#size.x
    }

    setCentroid(centroid: Point) {
        this.#centroid = centroid
    }

    svgBounds(recalculate: boolean = false): Bounds {
        // Get bounds in global coordinates
        return recalculate || this.#bounds === undefined
            ? Bounds.fromSvg(this.#svgElement, this.#globalTransform)
            : this.#bounds
    }

    updateGlobalTransform(transform: Transform): Transform | null {
        if (this.#globalTransform) {
            this.#globalTransform = this.#globalTransform.leftMultiply(transform)
            if (this.#globalTransform.isIdentity) {
                this.#globalTransform = null
            }
        } else {
            this.#globalTransform = transform
        }
        return this.#globalTransform
    }

    #selectionElementMembers(): SVGGraphicsElement[] {
        const members: SVGGraphicsElement[] = []
        if (this.#selectionElement.tagName === 'g'
         && this.#selectionElement.classList.contains(CELLDL_CLASS.Connection)) {
            const children = this.#selectionElement.children
            for (let index = 0; index < children.length; ++index) {
                // biome-ignore lint/style/noNonNullAssertion: index is in range
                members.push(children[index]! as SVGGraphicsElement)
            }
        } else {
            members.push(this.#selectionElement)
        }
        return members
    }

    #setSelectionClass(cls: string, enable: boolean) {
        if (enable) {
            for (const element of this.#selectionElementMembers()) {
                element.classList.add(cls)
            }
            this.#selectionClasses.add(cls)
        } else {
            for (const element of this.#selectionElementMembers()) {
                element.classList.remove(cls)
            }
            this.#selectionClasses.delete(cls)
        }
    }

    activate(active = true) {
        this.#setSelectionClass('active', active)
    }

    /**
     * Check if an object can be moved.
     *
     * Called when the pointer is over an object.
     *
     * @param      {SVGGraphicsElement}  _svgElement  The SVG element of the object the pointer is over
     * @return     {boolean}             `true` if the object can be moved, after changing the pointer's
     *                                   cursor to an appropriate form.
     */
    isMoveable(_svgElement: SVGGraphicsElement): boolean {
        return false
    }

    startMove(_svgPoint: PointLike) {}

    move(_svgPoint: PointLike) {}

    endMove() {}

    xBounds(padding: number = 0): [number, number] {
        padding = this.xPadding(padding)
        return [
            this.centroid.x + this.#cornerOffsets[2].x - padding,
            this.centroid.x + this.#cornerOffsets[0].x + padding
        ]
    }

    xPadding(padding: number): number {
        if (padding <= 1.0) {
            return Math.min(padding * this.width, MAX_CONNECTION_SPLAY_PADDING)
        }
        return padding
    }

    yBounds(padding: number = 0): [number, number] {
        padding = this.yPadding(padding)
        return [
            this.centroid.y + this.#cornerOffsets[2].y - padding,
            this.centroid.y + this.#cornerOffsets[0].y + padding
        ]
    }

    yPadding(padding: number): number {
        if (padding <= 1.0) {
            return Math.min(padding * this.height, MAX_CONNECTION_SPLAY_PADDING)
        }
        return padding
    }

    pointOutside(point: PointLike, padding: number = 0): boolean {
        const xBounds = this.xBounds(padding)
        const yBounds = this.yBounds(padding)
        return point.x < xBounds[0] || xBounds[1] < point.x || point.y < yBounds[0] || yBounds[1] < point.y
    }

    boundaryFace(point: PointLike): string {
        if (this.containsPoint(point)) {
            return ''
        }
        const delta = PointMath.subtract(point, this.centroid)
        if (delta.x < 0) {
            if (delta.y < 0) {
                return this.#cornerOffsets[2].x * delta.y < this.#cornerOffsets[2].y * delta.x ? 'L' : 'T'
            } else {
                return this.#cornerOffsets[3].x * delta.y < this.#cornerOffsets[3].y * delta.x ? 'B' : 'L'
            }
        } else {
            if (delta.y < 0) {
                return this.#cornerOffsets[1].x * delta.y < this.#cornerOffsets[1].y * delta.x ? 'T' : 'R'
            } else {
                return this.#cornerOffsets[0].x * delta.y < this.#cornerOffsets[0].y * delta.x ? 'R' : 'B'
            }
        }
    }

    containsPoint(point: PointLike, padding: number = 0): boolean {
        let bounds: [Point, Point]
        if (padding) {
            // expand corners by padding
            const pad = new Point(this.xPadding(padding), this.yPadding(padding))
            bounds = [
                this.#cornerOffsets[2].add({ x: -pad.x, y: -pad.y }), // TL
                this.#cornerOffsets[0].add({ x: pad.x, y: pad.y }) // BR
            ]
        } else {
            bounds = [this.#cornerOffsets[2], this.#cornerOffsets[0]]
        }
        const deltaX = point.x - this.centroid.x
        const deltaY = point.y - this.centroid.y
        return bounds[0].x <= deltaX && deltaX <= bounds[1].x && bounds[0].y <= deltaY && deltaY <= bounds[1].y
    }

    clearControlHandles() {}

    drawControlHandles() {}

    highlight(highlight = true) {
        this.#setSelectionClass('highlight', highlight)
    }

    pointerEvent(_eventType: string, _svgElement: SVGGraphicsElement, _svgCoords: PointLike): boolean {
        return false
    }

    redraw() {}

    remove() {
        this.svgElement.remove()
    }

    select(selected = true) {
        this.#setSelectionClass('selected', selected)
        this.#selected = selected
    }
}

//==============================================================================
