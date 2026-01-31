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


import { CELLDL_CLASS, type CellDLObject } from '@viewer/celldlObjects'
import { Point, type PointLike } from '@viewer/common/points'
import { CONNECTION_WIDTH, SELECTION_STROKE_WIDTH } from '@viewer/common/styling'
import { svgCircle } from '@viewer/common/svgUtils'
import { Bounds } from '@viewer/geometry'
import { FixedControlRect }from '@viewer/geometry/controls'
import { Transform } from '@viewer/geometry/transforms'


const CONDUIT_SELECTION_RADIUS = 9

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
        this.#updatedSvgElement()
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

    highlight(highlight = true) {
        this.#setSelectionClass('highlight', highlight)
    }

    pointerEvent(_eventType: string, _svgElement: SVGGraphicsElement, _svgCoords: PointLike): boolean {
        return false
    }

    select(selected = true) {
        this.#setSelectionClass('selected', selected)
        this.#selected = selected
    }

    #updateBounds() {
        const bounds = this.svgBounds(true)
        this.#size = new Point(bounds.right - bounds.left, bounds.bottom - bounds.top)
        if (this.#centroid) {
            this.#topLeft = this.#centroid.subtract(this.#size.scale(this.#centroidOffset))
            // Get bounds in local coordinates
            this.#bounds = new Bounds(
                this.#topLeft.x,
                this.#topLeft.y,
                this.#topLeft.x + this.#size.x,
                this.#topLeft.y + this.#size.y
            )
        } else {
            this.#topLeft = new Point(bounds.left, bounds.top)
            this.#bounds = bounds
            this.#centroid = this.#size.scale(this.#centroidOffset).add(this.#topLeft)
        }
        const topLeftOffset = this.#size.scale(this.#centroidOffset).scalarScale(-1)
        // Corner offsets are wrt centroid, anticlockwise from bottom right; see comment below in ``boundaryIntersections()``
        const connectionComponentGap: number = CONNECTION_WIDTH / 2 - SELECTION_STROKE_WIDTH / 2
        if (connectionComponentGap !== 0) {
            this.#cornerOffsets = [
                topLeftOffset.add(this.#size).add({ x: connectionComponentGap, y: connectionComponentGap }),
                topLeftOffset
                    .add({ x: this.#size.x, y: 0 })
                    .add({ x: connectionComponentGap, y: -connectionComponentGap }),
                topLeftOffset.add({ x: -connectionComponentGap, y: -connectionComponentGap }),
                topLeftOffset
                    .add({ x: 0, y: this.#size.y })
                    .add({ x: -connectionComponentGap, y: connectionComponentGap })
            ]
        } else {
            this.#cornerOffsets = [
                topLeftOffset.add(this.#size),
                topLeftOffset.add({ x: this.#size.x, y: 0 }),
                topLeftOffset,
                topLeftOffset.add({ x: 0, y: this.#size.y })
            ]
        }
    }

    #updatedSvgElement() {
        // Find the relative offset to the element's centroid
        this.#centroidOffset = new Point(0.5, 0.5)
        if (this.#svgElement.tagName === 'g') {
            const firstChild = this.#svgElement.children.item(0) as SVGGraphicsElement
            if (firstChild.dataset.centreX) {
                this.#centroidOffset = new Point(+firstChild.dataset.centreX, +firstChild.dataset.centreY!)
            }
        }
        // And set the elements bounds relative to its centroid
        this.#updateBounds()
        // Add a dummy rectangle to a group so that it can be activated and selected
        if (
            this.#svgElement.tagName === 'g' &&
            !this.#svgElement.classList.contains(CELLDL_CLASS.Connection) &&
            this.#svgElement.firstElementChild !== null
        ) {
            const bounds = (
                this.#svgElement.classList.contains(CELLDL_CLASS.Compartment)
                    ? Bounds.fromSvg(this.#svgElement.firstChild as SVGGraphicsElement)
                    : Bounds.fromSvg(this.#svgElement)
            ).expand(SELECTION_STROKE_WIDTH / 2)
            // Set height, width and offset of an <svg> child...
            if (this.#svgElement.firstElementChild.tagName === 'svg') {
                const svgChild = this.#svgElement.firstElementChild
                svgChild.setAttribute('x', `${bounds.topLeft.x}px`)
                svgChild.setAttribute('y', `${bounds.topLeft.y}px`)
                svgChild.setAttribute('width', `${bounds.width}px`)
                svgChild.setAttribute('height', `${bounds.height}px`)
            }
            const selectionRect = new FixedControlRect(bounds.asArray()) // versus control rect in RectangularObject
            const svg = selectionRect.svg({
                class: `selection-element parent-id editor-specific ${[...this.#selectionClasses.values()].join(' ')}`
            })
            this.#svgElement.insertAdjacentHTML('beforeend', svg)
            this.#selectionElement = this.#svgElement.lastChild as SVGGraphicsElement
            // Indicate a component is a conduit with a circular mark at its centre
            if (this.celldlObject.isConduit) {
                const centre = new Point(bounds.right - bounds.left, bounds.bottom - bounds.top)
                    .scale(this.#centroidOffset)
                    .add(new Point(bounds.left, bounds.top))
                const svg = svgCircle(centre, CONDUIT_SELECTION_RADIUS, {
                    class: 'selection-element parent-id editor-specific conduit'
                })
                this.#svgElement.insertAdjacentHTML('beforeend', svg)
            }
        }
    }
}

//==============================================================================
