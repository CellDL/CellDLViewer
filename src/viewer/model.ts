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

import {
    CellDLAnnotation,
    CellDLComponent,
    CellDLConduit,
    type CellDLConnectedObject,
    CellDLConnection,
    CellDLInterface,
    type CellDLObject,
    CellDLUnconnectedPort
} from '@viewer/celldlObjects'

import type { PointLike } from '@viewer/common/points'
import type { Constructor, StringProperties } from '@viewer/common/types'

import { lengthToPixels } from '@viewer/geometry/units'

import * as $rdf from '@viewer/metadata'
import {
    CELLDL,
    DCT,
    type NamedNode,
    type MetadataPropertyValue,
    OWL,
    RDF
} from '@viewer/metadata'

import { type CellDLViewer, notifyChanges } from '.'

import type { Annotation } from '../../index'

//==============================================================================
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

const CELLDL_METADATA_ID = 'celldl-rdf-metadata'

const VIEWER_DIAGRAM_URI = 'file://tmp/viewing.celldl'

//==============================================================================

export class CellDLModel {
    #svgDiagram: SVGSVGElement|null = null

    #kb = new $rdf.RdfStore()
    #celldlViewer: CellDLViewer

    #documentNode: NamedNode
    #documentNS: $rdf.Namespace

    #diagramMetadata: Record<string, NamedNode>
    #diagramProperties: StringProperties = {}

    #objects: Map<string, CellDLObject> = new Map()

    constructor(celldlData: string, _annotation: Annotation|undefined, celldlViewer: CellDLViewer) {
        this.#diagramMetadata = DIAGRAM_METADATA()
        this.#celldlViewer = celldlViewer
        this.#documentNode = $rdf.namedNode(VIEWER_DIAGRAM_URI)
        this.#documentNS = new $rdf.Namespace(`${VIEWER_DIAGRAM_URI}#`)
        if (celldlData !== '') {
            this.#loadSvgDiagram(celldlData)
            this.#loadMetadata()
        }
    }

    finishSetup() {
        // Called when the loaded diagram has been drawn as SVG
        this.#loadComponents()
        this.#loadInterfaces()
        this.#loadConduits()
        this.#loadConnections()
        this.#loadAnnotations()
    }

    async viewModel() {
        if (this.#svgDiagram) {
            await this.#celldlViewer.viewDiagram(this)
        } else {
            this.#celldlViewer.closeDiagram()
        }
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

    objectById(id: string): CellDLObject | null {
        return this.#objects.get(id) || null
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

    #loadMetadata() {
        const metadataElement = this.#svgDiagram!.getElementById(CELLDL_METADATA_ID) as SVGMetadataElement
        if (
            metadataElement &&
            (!('contentType' in metadataElement.dataset) || metadataElement.dataset.contentType === $rdf.TurtleContentType)
        ) {
            const childNodes = metadataElement.childNodes
            for (let index = 0; index < childNodes.length; ++index) {
                // biome-ignore lint/style/noNonNullAssertion: index is in range
                const childNode = childNodes[index]!
                if (childNode.nodeName === '#cdata-section') {
                    this.#kb.load(this.#documentNode.uri, (<CDATASection>childNode).data, $rdf.TurtleContentType)
                    break
                }
            }
        }
        if (!this.#kb.contains(this.#documentNode, RDF.uri('type'), CELLDL.uri('Document'))) {
            throw new Error("Metadata doesn't describe a valid CellDL document")
        }
    }

    #setObjectSvgElement(celldlObject: CellDLObject): boolean {
        const svgElement = <SVGGraphicsElement>this.#svgDiagram!.getElementById(celldlObject.id)
        if (svgElement) {
            celldlObject.assignSvgElement(svgElement)
            return true
        }
        console.error(`Missing SVG element for ${celldlObject.id}`)
        return false
    }

    #celldlObjectFromRdf<T extends CellDLObject>(CellDLClass: Constructor<T>, subject: $rdf.SubjectType): T {
        const metadata = this.#kb.metadataPropertiesForSubject(subject)
        const celldlObject = new CellDLClass(subject, metadata, this)
        return celldlObject
    }

    #subjectsOfType(parentType: NamedNode): [$rdf.SubjectType, NamedNode][] {
        return this.#kb.subjectsOfType(parentType).filter((st) => st[0].value.startsWith(this.#documentNode.value))
    }

    #addMoveableObject(object: CellDLObject) {
        this.#objects.set(object.id, object)
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
        // @ts-expect-error: `value` property exists on a NamedNode
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
