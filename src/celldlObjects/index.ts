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

import type { PointLike } from '@viewer/common/points'
import type { PropertiesType } from '@viewer/common/types'
import { BoundedElement } from '@viewer/SVGElements/boundedelement'
import type { CellDLSVGElement } from '@viewer/SVGElements/index'
import type { CellDLModel } from '@viewer/viewer/model'

//==============================================================================

export enum CELLDL_CLASS {
    Annotation = 'celldl-Annotation',
    Component = 'celldl-Component',
    Connector = 'celldl-Connector',
    Connection = 'celldl-Connection',
    Conduit = 'celldl-Conduit',
    Compartment = 'celldl-Compartment',
    Interface = 'celldl-InterfacePort',
    Layer = 'celldl-Layer',
    UnconnectedPort = 'celldl-Unconnected',
    Unknown = ''
}

//==============================================================================

export class CellDLObject {
    static celldlClassName: CELLDL_CLASS = CELLDL_CLASS.Unknown
    static celldlType: string = 'Object'

    #celldlClassName: CELLDL_CLASS
    #celldlModel: CellDLModel
    #celldlSvgElement: CellDLSVGElement|undefined
    #celldlType: string

    #label: string | null = null
    #name: string = ''
    #moveable: boolean = false

    constructor(
        public readonly uri: string,
        readonly options: PropertiesType = {},
        celldlModel: CellDLModel
    ) {
        this.#celldlModel = celldlModel
        // @ts-expect-error: celldlClassName is a member of the object's constructor
        this.#celldlClassName = this.constructor.celldlClassName
        // @ts-expect-error: celldlType is a member of the object's constructor
        this.#celldlType = CELLDL.uri(this.constructor.celldlType)
    }

    toString(): string {
        return `${this.#celldlClassName} ${this.id}`
    }

    get celldlClassName() {
        return this.#celldlClassName
    }

    get celldlModel() {
        return this.#celldlModel
    }

    get celldlSvgElement() {
        return this.#celldlSvgElement
    }
    setCelldlSvgElement(celldlSvgElement: CellDLSVGElement) {
        this.#celldlSvgElement = celldlSvgElement
    }

    get hasEditGuides() {
        return false
    }

    get id(): string {
        return this.uri   // Or return fragment identifier
    }

    isA(type: string) {
        return type === this.#celldlType
    }

    get isAlignable() {
        return true
    }

    get isAnnotation() {
        return this.celldlClassName === CELLDL_CLASS.Annotation
    }

    get isComponent() {
        // Conduits are a component sub-class
        return this.celldlClassName === CELLDL_CLASS.Component || this.celldlClassName === CELLDL_CLASS.Conduit
    }

    get isConduit() {
        return this.celldlClassName === CELLDL_CLASS.Conduit
    }

    get isConnectable() {
        return false
    }

    get isConnection() {
        return this.celldlClassName === CELLDL_CLASS.Connection
    }

    get isCompartment() {
        return this.celldlClassName === CELLDL_CLASS.Compartment
    }

    get isInterface() {
        return this.celldlClassName === CELLDL_CLASS.Interface
    }

    get label() {
        return this.#label
    }

    get moveable() {
        return this.#moveable
    }

    get name() {
        return this.#name
    }

    get selected() {
        return this.#celldlSvgElement?.selected
    }

    get svgElement() {
        return this.#celldlSvgElement?.svgElement || null
    }

    activate(active = true) {
        this.#celldlSvgElement?.activate(active)
    }

    containsPoint(point: PointLike): boolean {
        return this.#celldlSvgElement?.containsPoint(point) || false
    }

    initialiseMove(svgElement: SVGGraphicsElement) {
        this.#moveable = this.#celldlSvgElement?.isMoveable(svgElement) || false
        if (this.#moveable) {
            svgElement.style.setProperty('cursor', 'move')
        }
    }

    highlight(highlight = true) {
        this.#celldlSvgElement?.highlight(highlight)
    }

    redraw() {
        if (this.#celldlSvgElement) {
            this.#celldlSvgElement.redraw()
        }
    }

    select(selected = true) {
        this.#celldlSvgElement?.select(selected)
    }

    setName(name: string) {
        this.#name = name
    }

    assignSvgElement(_svgElement: SVGGraphicsElement, _align: boolean) {
    }
}

//==============================================================================

export class CellDLMoveableObject extends CellDLObject {
    assignSvgElement(svgElement: SVGGraphicsElement, align: boolean) {
        new BoundedElement(this, svgElement, this.isAlignable, align)
    }
}

//==============================================================================

export class CellDLAnnotation extends CellDLMoveableObject {
    static celldlClassName = CELLDL_CLASS.Annotation
    static celldlType = 'Annotation'
}

//==============================================================================

export class CellDLConnectedObject extends CellDLMoveableObject {
    static celldlType = 'Connector'

    get isConnectable() {
        return true
    }
}

//==============================================================================

export class CellDLComponent extends CellDLConnectedObject {
    static celldlClassName = CELLDL_CLASS.Component
    static celldlType = 'Component'
}

//==============================================================================

export class CellDLConduit extends CellDLComponent {
    static readonly celldlClassName = CELLDL_CLASS.Conduit
    static celldlType = 'Conduit'
}

//==============================================================================

export class CellDLCompartment extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.Compartment
    static celldlType = 'Compartment'

    get isAlignable() {
        return false
    }
}

//==============================================================================

export class CellDLConnection extends CellDLObject {
    static readonly celldlClassName = CELLDL_CLASS.Connection
    static celldlType = 'Connection'

    get isAlignable() {
        return false
    }
}

//==============================================================================

export class CellDLInterface extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.Interface
    static celldlType = 'Interface'

    #externalConnections: CellDLConnection[] = []

    toString(): string {
        return `${super.toString()}  External: ${this.#externalConnections.map((c) => c.id).join(', ')}`
    }

    get isAlignable() {
        return false
    }
}

//==============================================================================

export class CellDLUnconnectedPort extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.UnconnectedPort
    static celldlType = 'UnconnectedPort'
}

//==============================================================================
//==============================================================================
