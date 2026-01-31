/******************************************************************************

CellDL Viewer

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

import * as vue from 'vue'
import { useTippy } from "vue-tippy"

//==============================================================================

import '@viewer/assets/svgContent.css'

import type { CellDLObject } from '@viewer/celldlObjects'
import type { PointLike } from '@viewer/common/points'

import type { CellDLModel } from './model'

//==============================================================================

import PanZoom from './panzoom'

//==============================================================================

const MAX_POINTER_CLICK_TIME = 200 // milliseconds

//==============================================================================

export function notifyChanges() {
    document.dispatchEvent(new CustomEvent('file-edited'))
}

//==============================================================================

export function getElementId(element: SVGGraphicsElement): string {
    return element.dataset.parentId
        ? element.dataset.parentId
        : element.classList.contains('parent-id')
          ? element.parentElement?.id || ''
          : element.id
}

//==============================================================================

const SVG_PANEL_ID = 'svg-panel'

export class CellDLViewer {
    static instance: CellDLViewer | null = null

    #container: HTMLElement | null = null
    #celldlModel: CellDLModel | null = null
    #svgDiagram: SVGSVGElement | null = null

    #panning: boolean = false
    #panzoom: PanZoom | null = null
    #pointerMoved: boolean = false

    #activeObject: CellDLObject | null = null
    #selectedObject: CellDLObject | null = null

    #pointerDownTime: number = 0

    #tooltip: vue.Ref|undefined
    #tooltipElement: HTMLElement|undefined
    #tooltipStyle: string = ''

    constructor() {
        CellDLViewer.instance = this
    }

    mount(svgContainer: HTMLElement) {
        this.#container = svgContainer

        // Create a panzoom handler
        this.#panzoom = new PanZoom(this.#container)

        // Create a tooltip

        const { tippy } = useTippy(this.#container, {
            content: '',
            animation: 'none',
            duration: [0, 0],
            showOnCreate: false,
            hideOnClick: false,
            trigger: 'manual',
            arrow: true,
            followCursor: true
        })
        if (tippy.value) {
            this.#tooltip = tippy
            this.#tooltipElement = this.#tooltip.value.popper
        }
    }

    #addPointerEventHandlers() {
        if (this.#container) {
            this.#container.addEventListener('click', this.#pointerClickEvent.bind(this))

            this.#container.addEventListener('pointerover', this.#pointerOverEvent.bind(this))
            this.#container.addEventListener('pointerout', this.#pointerOutEvent.bind(this))

            this.#container.addEventListener('pointerdown', this.#pointerDownEvent.bind(this))
            this.#container.addEventListener('pointermove', this.#pointerMoveEvent.bind(this))
            this.#container.addEventListener('pointerup', this.#pointerUpEvent.bind(this))
        }
    }

    #removePointerEventHandlers() {
        if (this.#container) {
            this.#container.removeEventListener('click', this.#pointerClickEvent.bind(this))

            this.#container.removeEventListener('pointerover', this.#pointerOverEvent.bind(this))
            this.#container.removeEventListener('pointerout', this.#pointerOutEvent.bind(this))

            this.#container.removeEventListener('pointerdown', this.#pointerDownEvent.bind(this))
            this.#container.removeEventListener('pointermove', this.#pointerMoveEvent.bind(this))
            this.#container.removeEventListener('pointerup', this.#pointerUpEvent.bind(this))
        }
    }

    get celldlModel() {
        return this.#celldlModel
    }

    get windowSize(): [number, number] {
        if (this.#container) {
            return [this.#container.clientWidth, this.#container.clientHeight]
        }
        return [0, 0]
    }

    async viewDiagram(celldlModel: CellDLModel) {
        if (this.#celldlModel !== null) {
            this.closeDiagram(true)
        } else {
            this.#addPointerEventHandlers()
        }
        this.#celldlModel = celldlModel
        this.#svgDiagram = celldlModel.svgDiagram!

        // Show the model's diagram in the viewer's window
        if (this.#container) {
            this.#container.appendChild(this.#svgDiagram!)
        }

        // Allow for the diagram to render
        await vue.nextTick()

        // Finish setting up the model as we now have SVG elements
        celldlModel.finishSetup()

        // Enable pan/zoom and toolBars
        this.#panzoom?.enable(this.#svgDiagram)

        // Set initial state
        this.#activeObject = null
        this.#pointerMoved = false
        this.#selectedObject = null
    }

    closeDiagram(newDiagram: boolean=false) {
        if (this.#celldlModel !== null) {
            if (!newDiagram) {
                this.#removePointerEventHandlers()
            }
            this.#panzoom?.disable()
            if (this.#container) {
                this.#container.removeChild(this.#svgDiagram as Node)
            }
            this.#svgDiagram = null
            this.#celldlModel = null
        }
    }

    resetObjectStates() {
        this.#unsetSelectedObject()
        this.#unsetActiveObject()
    }

    #setDefaultCursor() {
        this.#svgDiagram?.style.removeProperty('cursor')
        if (this.#container) {
            this.#container.style.setProperty('cursor', 'default')
        }
    }

    #hideTooltip() {
        if (this.#tooltip) {
            this.#tooltip.value.hide()
        }
    }

    showTooltip(msg: string, style: string = '') {
        if (msg === '') {
            this.#hideTooltip()
        } else if (this.#tooltip) {
            this.#tooltip.value.setContent(msg)
            this.#tooltip.value.show()
            if (this.#tooltipElement) {
                if (this.#tooltipStyle !== '') {
                    this.#tooltipElement.classList.remove(this.#tooltipStyle)
                    this.#tooltipStyle = ''
                }
                if (style !== '') {
                    const tooltipStyle = `tooltip-${style}`
                    this.#tooltipElement.classList.add(tooltipStyle)
                    this.#tooltipStyle = tooltipStyle
                }
            }
        }
    }

    #domToSvgCoords(domCoords: PointLike): DOMPoint {
        return this.#celldlModel!.domToSvgCoords(domCoords)
    }

    #activateObject(object: CellDLObject, active: boolean) {
        object.activate(active)
    }

    #setActiveObject(activeObject: CellDLObject | null) {
        if (activeObject && this.#activeObject !== activeObject) {
            this.#activateObject(activeObject, true)
            this.#activeObject = activeObject
        }
    }

    #unsetActiveObject() {
        if (this.#activeObject) {
            this.#activateObject(this.#activeObject, false)
            this.#activeObject = null
        }
    }

    #setSelectedObject(selectedObject: CellDLObject) {
        this.#unsetSelectedObject() // This will depend upon multi-selection
        if (selectedObject !== null) {
            selectedObject.select(true)
            this.#selectedObject = selectedObject
        }
    }

    #unsetSelectedObject() {
        if (this.#selectedObject) {
            this.#selectedObject.select(false)
            this.#selectedObject = null
        }
    }

    #objectClickEvent(event: Event) {
        const detail = (<CustomEvent>event).detail
        const clickedObject: CellDLObject = detail.clickedObject
        this.#selectionClickEvent(detail.event, clickedObject.svgElement!, clickedObject)
    }

    #pointerClickEvent(event: MouseEvent) {
        const element = event.target as SVGGraphicsElement
        if (
            this.#celldlModel === null ||
            !this.#svgDiagram?.contains(element) ||
            // clickTolerance = 1px ? to set pointerMoved?
            (this.#pointerMoved && Date.now() - this.#pointerDownTime > MAX_POINTER_CLICK_TIME)
        ) {
            return
        }
        const clickedObject = this.#celldlModel.objectById(getElementId(element))
        this.#selectionClickEvent(event, element, clickedObject)
    }

    #selectionClickEvent(event: MouseEvent, _element: SVGGraphicsElement, clickedObject: CellDLObject|null) {
        let deselected = false
        if (this.#selectedObject !== null) {
            // Deselect
            deselected = clickedObject === this.#selectedObject
            this.#unsetSelectedObject()
        }
        if (!deselected && clickedObject && clickedObject === this.#activeObject) {
            // Select when active object is clicked
            this.#setSelectedObject(clickedObject)
        }
    }

    #notDiagramElement(element: SVGGraphicsElement) {
        return (
            element === this.#svgDiagram ||
            element.id === SVG_PANEL_ID ||
            !this.#svgDiagram?.contains(element)
        )
    }

    #pointerOverEvent(event: PointerEvent) {
        if (this.#celldlModel === null) {
            return
        }
        const element = event.target as SVGGraphicsElement
        const currentObject = this.#celldlModel.objectById(getElementId(element))

        if (this.#notDiagramElement(element)) {
            this.#hideTooltip()
            if (this.#activeObject && currentObject !== this.#activeObject) {
                this.#unsetActiveObject()
            }
            return
        }

        if (this.#activeObject && currentObject !== this.#activeObject) {
            this.#unsetActiveObject()
        }
        if (currentObject) {
            this.#setActiveObject(currentObject)
        }
    }

    #pointerOutEvent(event: PointerEvent) {
        const element = event.target as SVGGraphicsElement
        if (element === this.#svgDiagram || !this.#svgDiagram?.contains(element)) {
            if (this.#activeObject) {
                this.#unsetActiveObject()
            }
        }
    }

    #pointerDownEvent(event: PointerEvent) {
        this.#pointerMoved = false
        this.#pointerDownTime = Date.now()
        this.#svgDiagram?.style.removeProperty('cursor')
        this.#container?.style.setProperty('cursor', 'grab')
        this.#panzoom!.pointerDown(event)
        this.#panning = true
    }

    #pointerMoveEvent(event: PointerEvent) {
        if (this.#panning) {
            this.#pointerMoved = this.#panzoom!.pointerMove(event) || this.#pointerMoved
            return
        }
        this.#pointerMoved = true
    }

    #pointerUpEvent(event: PointerEvent) {
        if (this.#celldlModel === null) {
            return
        }
        if (this.#panning) {
            this.#panzoom!.pointerUp(event)
            this.#panning = false
            this.#setDefaultCursor()
            return
        }
    }
}

//==============================================================================
//==============================================================================
