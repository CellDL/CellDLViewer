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

import type { PointLike } from '@renderer/common/points'
import { CELLDL_BACKGROUND_CLASS, CellDLStylesheet } from '@renderer/common/styling'
import { svgCircleElement, SVG_URI, svgRectElement } from '@renderer/common/svgUtils'
import type { Constructor, StringProperties } from '@renderer/common/types'

import * as $rdf from '@renderer/metadata/index'
import {
    CELLDL,
    CELLDL_DECLARATIONS,
    DCT,
    type NamedNode,
    MetadataPropertiesMap,
    type MetadataPropertyValue,
    OWL,
    RDF
} from '@renderer/metadata/index'

import type { Bounds, Extent } from '@editor/geometry/index'
import { lengthToPixels } from '@editor/geometry/units'

import { CELLDL_CLASS, CellDLObject } from '@editor/celldlObjects/index'
import {
    CellDLAnnotation,
    CellDLComponent,
    CellDLConduit,
    type CellDLConnectedObject,
    CellDLConnection,
    CellDLInterface,
    CellDLUnconnectedPort
} from '@editor/celldlObjects/index.ts'

import type { BoundedElement } from '@editor/SVGElements/boundedelement'
import type { SvgConnection } from '@editor/SVGElements/svgconnection'

import { type CellDLViewer, notifyChanges } from '@editor/viewer/index'
import { editGuides } from '@editor/viewer/editguides'
import { type EditorUndoAction, undoRedo } from '@editor/viewer/undoredo'

import type { ObjectTemplate } from '@editor/components/index'

import { componentLibraryPlugin } from '@renderer/plugins/index'

//==============================================================================

export const CELLDL_VERSION = '1.0'

//==============================================================================

function DIAGRAM_METADATA() {
    return {
        author: DCT.uri('creator'),
        created: DCT.uri('created'),
        description: DCT.uri('description'),
        modified: DCT.uri('modified'),
        title: DCT.uri('title'),
        celldlVersion: OWL.uri('versionInfo')
    }
}

//==============================================================================

const NEW_DIAGRAM_URI = 'file:///tmp/new_file.celldl'

//==============================================================================

const CELLDL_DEFINITIONS_ID = 'celldl-svg-definitions'
export const CELLDL_METADATA_ID = 'celldl-rdf-metadata'
const CELLDL_STYLESHEET_ID = 'celldl-svg-stylesheet'

const DIAGRAM_MARGIN = 20

//==============================================================================

const CELLDL_DIAGRAM_ID = 'celldl-diagram-layer'

const ID_PREFIX = 'ID-'

//==============================================================================

export class CellDLModel {
    #svgDiagram!: SVGSVGElement

    #kb = new $rdf.RdfStore()
    #celldlViewer: CellDLViewer

    #documentNode: NamedNode
    #documentNS: $rdf.Namespace
    #filePath: string

    #diagramMetadata: Record<string, NamedNode>
    #diagramProperties: StringProperties = {}

    #objects: Map<string, CellDLObject> = new Map()

    constructor(filePath: string, celldlData: string, celldlViewer: CellDLViewer, importSvg: boolean = false) {
        this.#diagramMetadata = DIAGRAM_METADATA()
        this.#filePath = filePath
        this.#celldlViewer = celldlViewer
        if (this.#filePath !== '') {
            let documentUri = encodeURI(this.#filePath)
            if (
                !documentUri.startsWith('file:') &&
                !documentUri.startsWith('http:') &&
                !documentUri.startsWith('https:')
            ) {
                documentUri = `file://${documentUri}`
            }
            this.#documentNode = $rdf.namedNode(documentUri)
            this.#documentNS = new $rdf.Namespace(`${documentUri}#`)
            this.#loadCellDL(celldlData)
        }
    }

    finishSetup() {
        // Called when the loaded diagram has been drawn as SVG
        this.#loadComponents()
        this.#loadInterfaces()
        this.#loadConduits()
        this.#loadConnections()
        this.#loadAnnotations()
        if (this.#imported) {
            // We want the file to be flagged as modified
            notifyChanges()
        }
    }

    async view() {
        await this.#celldlViewer.viewDiagram(this)
    }

    get metadata(): StringProperties {
        return Object.keys(this.#diagramProperties)
            .filter((key) => key in this.#diagramMetadata)
            .reduce((obj: Record<string, any>, key: string) => {
                obj[key] = this.#diagramProperties[key]
                return obj
            }, {})
    }
    set metadata(data: StringProperties) {
        Object.keys(data)
            .filter((key) => key in this.#diagramMetadata)
            .forEach((key) => {
                // @ts-expect-error: `key` is a valid key for `data`
                this.#diagramProperties[key] = data[key]
            })
        notifyChanges()
    }

    get rdfStore() {
        return this.#kb
    }

    get svgDiagram() {
        return this.#svgDiagram
    }

    get uri(): string {
        return this.#documentNode.value
    }

    domToSvgCoords(domCoords: PointLike): DOMPoint {
        // Transform from screen coordinates to SVG coordinates
        const dom_to_svg_transform: DOMMatrix | undefined = this.#svgDiagram?.getScreenCTM()?.inverse()
        return DOMPoint.fromPoint(domCoords).matrixTransform(dom_to_svg_transform)
    }

    svgToDomCoords(svgCoords: PointLike): DOMPoint {
        // Transform from SVG coordinates to screen coordinates
        const svg_to_dom_transform: DOMMatrix | undefined = this.#svgDiagram?.getScreenCTM() as DOMMatrix
        return DOMPoint.fromPoint(svgCoords).matrixTransform(svg_to_dom_transform)
    }

    makeUri(id: string): NamedNode {
        return this.#documentNS.uri(id)
    }

    #loadDiagramProperties() {
        for (const [key, property] of Object.entries(this.#diagramMetadata)) {
            for (const stmt of this.#kb.statementsMatching(this.#documentNode, property, null)) {
                this.#diagramProperties[key] = stmt.object.value
                break
            }
        }
    }

    objectById(id: string): CellDLObject | null {
        return this.#objects.get(id) || null
    }

    #loadCellDL(celldlData: string) {
        this.#loadSvgDiagram(celldlData)
    }

    #loadSvgDiagram(svgData: string) {
        const parser = new DOMParser()
        const svgDocument = parser.parseFromString(svgData, 'image/svg+xml')
        const svgDiagram = <SVGSVGElement>svgDocument.firstElementChild
        if (svgDiagram.hasAttribute('width') && svgDiagram.hasAttribute('height')) {
            const width = lengthToPixels(<string>svgDiagram.getAttribute('width'))
            const height = lengthToPixels(<string>svgDiagram.getAttribute('height'))
            if (width !== null && height !== null) {
                svgDiagram.attributes.removeNamedItem('width')
                svgDiagram.attributes.removeNamedItem('height')
                if (!svgDiagram.hasAttribute('viewBox')) {
                    svgDiagram.setAttribute('viewBox', `0 0 ${width} ${height}`)
                }
            }
        }
        this.#svgDiagram = svgDiagram
    }

    #setObjectSvgElement(celldlObject: CellDLObject): boolean {
        const svgElement = <SVGGraphicsElement>this.#svgDiagram.getElementById(celldlObject.id)
        if (svgElement) {
            celldlObject.assignSvgElement(svgElement, false)
            if (celldlObject.hasEditGuides) {
                editGuides.addGuide(<CellDLComponent>celldlObject)
            }
            return true
        }
        console.error(`Missing SVG element for ${celldlObject.id}`)
        return false
    }

    #subjectsOfType(parentType: NamedNode): [$rdf.SubjectType, NamedNode][] {
        return this.#kb.subjectsOfType(parentType).filter((st) => st[0].value.startsWith(this.#documentNode.value))
    }

    #loadObject<T extends CellDLObject>(type: NamedNode, CellDLClass: Constructor<T>) {
        for (const subjectType of this.#subjectsOfType(type)) {
            if (subjectType[1].equals(type)) {
                const object = this.#celldlObjectFromRdf(CellDLClass, subjectType[0])
                if (this.#setObjectSvgElement(object)) {
                    this.#addMoveableObject(object)
                }
            }
        }
    }

    #loadAnnotations() {
        this.#loadObject(CELLDL.uri('Annotation'), CellDLAnnotation)
    }

    #loadComponents() {
        this.#loadObject(CELLDL.uri('Component'), CellDLComponent)
        this.#loadObject(CELLDL.uri('UnconnectedPort'), CellDLUnconnectedPort)
    }

    #loadInterfaces() {
        this.#loadObject(CELLDL.uri('Connector'), CellDLInterface)
    }

    #loadConduits() {
        this.#loadObject(CELLDL.uri('Conduit'), CellDLConduit)
    }

    getConnector(connectorNode: MetadataPropertyValue | null): CellDLConnectedObject | null {
        if (connectorNode && $rdf.isNamedNode(connectorNode) && connectorNode.value.startsWith(this.#documentNode.value)) {
            const connectorId = (<NamedNode>connectorNode).id()
            const connector = this.#objects.get(connectorId) as CellDLConnectedObject
            return connector?.isConnectable ? connector : null
        }
        return null
    }

    #loadConnections() {
        this.#loadObject(CELLDL.uri('Connection'), CellDLConnection)
    }
}

//==============================================================================
