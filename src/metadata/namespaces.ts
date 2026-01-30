/******************************************************************************

CellDL Editor

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

import { isNamedNode, namedNode, type NamedNode } from './rdfstore'

import { SVG_URI } from '@renderer/common/svgUtils'

//==============================================================================

export const CELLDL_URI = 'http://celldl.org/ontologies/celldl#'

export const BG_URI = 'https://bg-rdf.org/ontologies/bondgraph#'
export const BGF_URI = 'https://bg-rdf.org/ontologies/bondgraph-framework#'
export const CDT_URI = 'https://w3id.org/cdt/'

export const TPL_URI = 'https://bg-rdf.org/templates/'

export const DCT_URI = 'http://purl.org/dc/terms/'
export const OWL_URI = 'http://www.w3.org/2002/07/owl#'
export const RDF_URI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
export const RDFS_URI = 'http://www.w3.org/2000/01/rdf-schema#'
export const XSD_URI = 'http://www.w3.org/2001/XMLSchema#'

//==============================================================================

export const CELLDL_DECLARATIONS = {
    celldl: CELLDL_URI,

    // These should come from BG plugin
    bg: BG_URI,
    bgf: BGF_URI,
    cdt: CDT_URI,
    tpl: TPL_URI
}

export const WEB_DECLARATIONS = {
    dcterms: DCT_URI,
    owl: OWL_URI,
    rdf: RDF_URI,
    rdfs: RDFS_URI,
    svg: `${SVG_URI}/`,
    xsd: XSD_URI
}

const declaredNamespaces = Object.assign({}, CELLDL_DECLARATIONS, WEB_DECLARATIONS)

export const SPARQL_PREFIXES = Object.entries(declaredNamespaces).map(
                                    (prefixUri) => `PREFIX ${prefixUri[0]}: <${prefixUri[1]}>`).join('\n')

//==============================================================================

export type NamespaceType = (_: string) => NamedNode

export class Namespace {
    #nsuri: string

    constructor(nsuri: string) {
        this.#nsuri = nsuri
    }

    uri(ln: string): NamedNode {
        return namedNode(this.#nsuri + (ln || ''))
    }
}

//==============================================================================

export const CELLDL = new Namespace(CELLDL_URI)

export const BG = new Namespace(BG_URI)
export const BGF = new Namespace(BGF_URI)
export const CDT = new Namespace(CDT_URI)
export const TPL = new Namespace(TPL_URI)

export const DCT = new Namespace(DCT_URI)
export const OWL = new Namespace(OWL_URI)
export const RDF = new Namespace(RDF_URI)
export const RDFS = new Namespace(RDFS_URI)
export const XSD = new Namespace(XSD_URI)

//==============================================================================

export function curieSuffix(NS: Namespace, term: string | NamedNode): string {
    const curie: string = isNamedNode(term) ? (<NamedNode>term).uri : <string>term
    const fullUri = expandCurie(curie)
    const nsUri = NS.uri('').uri
    if (fullUri.startsWith(nsUri)) {
        return fullUri.slice(nsUri.length)
    }
    return curie
}

//==============================================================================

export function getCurie(term: string | NamedNode): string {
    const fullUri: string = isNamedNode(term) ? (<NamedNode>term).uri : <string>term
    for (const [prefix, nsUri] of Object.entries(declaredNamespaces)) {
        if (fullUri.startsWith(nsUri)) {
            return `${prefix}:${fullUri.slice(nsUri.length)}`
        }
    }
    return fullUri
}

//==============================================================================

const declaredNamespacesMap = new Map(Object.entries(declaredNamespaces))

export function expandCurie(curie: string): string {
    const parts = curie.split(':')
    // @ts-expect-error: `parts[0]` is defined
    if (parts.length > 1 && declaredNamespacesMap.has(parts[0])) {
        // @ts-expect-error: `parts[0]` is defined
        return `${declaredNamespacesMap.get(parts[0])}${parts.slice(1).join(':')}`
    }
    return curie
}

//==============================================================================
//==============================================================================
