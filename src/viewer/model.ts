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

import type { CellDLViewer } from '.'

import type { Annotations, Annotation, ViewerEvent } from '../../index'

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

    #annotations: Map<string, Annotation> = new Map()
    #objects: Map<string, CellDLObject> = new Map()

        this.#diagramMetadata = DIAGRAM_METADATA()
    constructor(celldlViewer: CellDLViewer, celldlData: string='', annotations: Annotations={}) {
        this.#celldlViewer = celldlViewer
        this.#documentNode = $rdf.namedNode(VIEWER_DIAGRAM_URI)
        this.#documentNS = new $rdf.Namespace(`${VIEWER_DIAGRAM_URI}#`)
        if (celldlData !== '') {
            this.#loadSvgDiagram(celldlData)
            this.#loadMetadata()
            for (const object of this.#objects.values()) {
                if (object.id in annotations) {
                    // @ts-expect-error: objectId is in annotations
                    const annotation: Annotation = annotations[object.id]
                    this.#annotations.set(object.id, annotation)
                }
            }
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

    viewerEvent(type: string, object: CellDLObject|undefined=undefined) {
        const eventDetail: ViewerEvent = {
            type: type
        }
        if (object) {
            eventDetail.component = {
                id: object.id
            }
            if (this.#annotations.has(object.id)) {
                eventDetail.component.annotation = this.#annotations.get(object.id)
            }
        }
        document.dispatchEvent(
            new CustomEvent('viewer-event', {
                detail: eventDetail
            })
        )
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
        const metadataElement = this.#svgDiagram?.getElementById(CELLDL_METADATA_ID) as SVGMetadataElement
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
        const svgElement = <SVGGraphicsElement>this.#svgDiagram?.getElementById(celldlObject.id)
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
