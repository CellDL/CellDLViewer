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

export {
    blankNode,
    isBlankNode,
    literal,
    isLiteral,
    namedNode,
    isNamedNode,
    TurtleContentType,
    RdfStore
} from './rdfstore.ts'

export type {
    BlankNode,
    Literal,
    NamedNode,
    Statement,
    SubjectType,
    PredicateType,
    ObjectType,
    ContentType,
    Term
} from './rdfstore.ts'

export type { PredicateValue } from './store.ts'

export * from './namespaces.ts'

//==============================================================================

import { type Literal, isLiteral, type NamedNode, namedNode, isNamedNode } from './rdfstore'

import type { PredicateType } from './rdfstore'

import { RDF } from './namespaces'

//==============================================================================

/**
 * The type of the ``object`` of a ``predicate``
 */
export type MetadataPropertyValue = Literal | NamedNode | MetadataCollection
export type MetadataCollection = MetadataPropertyValue[] | Set<MetadataPropertyValue> | MetadataPropertiesMap

/**
 * A ``<predicate, object>`` pair
 */
export type MetadataProperty = [NamedNode, MetadataPropertyValue]

//==============================================================================

export function fragment(uri: NamedNode|string): string {
    // @ts-expect-error: uri is a NamedNode
    const uriString = isNamedNode(uri) ? uri.value : uri
    const parts = uriString.split('#')
    return parts.at(-1)
}

//==============================================================================

/**
 * An associative map with ``object`` values for a subject's ``predicate`` properties.
 *
 * We extend ``Map`` to add a ``copy()`` method.
 */
export class MetadataPropertiesMap extends Map<string, MetadataPropertyValue> {
    #rdfTypes: Set<string> = new Set()

    static fromProperties(properties: MetadataProperty[]): MetadataPropertiesMap {
        return properties.reduce((metadata, prop) => {
            metadata.setProperty(prop[0], prop[1])
            return metadata
        }, new MetadataPropertiesMap())
    }

    get rdfTypes() {
        return this.#rdfTypes
    }

    copy(): MetadataPropertiesMap {
        const metadata = new MetadataPropertiesMap()
        for (const [key, value] of this.entries()) {
            metadata.set(key, this.#copyValue(value))
        }
        metadata.#rdfTypes = new Set(this.#rdfTypes.values())
        return metadata
    }

    #copyValue(value: MetadataPropertyValue): MetadataPropertyValue {
        if (isLiteral(value) || isNamedNode(value)) {
            return value
        } else if (value instanceof MetadataPropertiesMap) {
            return value.copy()
        } else if (Array.isArray(value)) {
            return value.map((v) => this.#copyValue(v)) as MetadataPropertyValue
        } else {
            // @ts-expect-error: `value` is not a Literal nor NamedNode
            return new Set([...value.values()].map((v) => this.#copyValue(v))) as MetadataPropertyValue
        }
    }

    getProperty(predicate: PredicateType): MetadataPropertyValue | null {
        return this.get(predicate.value) || null
    }

    getPropertyAsArray(predicate: PredicateType): MetadataPropertyValue[] {
        const value = this.getProperty(predicate)
        if (!value) return []
        if (isLiteral(value) || isNamedNode(value) || value instanceof MetadataPropertiesMap) {
            return [value]
        } else if (Array.isArray(value)) {
            return value
        } else {
            // @ts-expect-error: `value` is a set`
            return [...value.values()]
        }
    }

    isA(type: NamedNode): boolean {
        return this.#rdfTypes.has(type.uri)
    }

    *predicateValues(): IterableIterator<[NamedNode, MetadataPropertyValue]> {
        for (const [p, value] of super.entries()) {
            yield [namedNode(p), value]
        }
    }

    setProperty(predicate: PredicateType, value: MetadataPropertyValue, multiValued = false) {
        if (predicate.equals(RDF.uri('type')) && isNamedNode(value)) {
            // @ts-expect-error: `value` is a NamedNode
            this.#rdfTypes.add(value.uri)
        }
        // @ts-expect-error: `predicate` is a NamedNode
        const property = predicate.uri
        if (multiValued && this.has(property)) {
            const values = this.get(property)
            if (values instanceof Set) {
                let inSet = false
                if (isLiteral(value) || isNamedNode(value)) {
                    for (const v of values) {
                        // @ts-expect-error: `value` is a Literal or NamedNode
                        if (value.equals(v)) {
                            inSet = true
                            break
                        }
                    }
                }
                if (!inSet) {
                    values.add(value)
                }
            } else if (values) {
                // @ts-expect-error: `values` is a Literal or NamedNode
                if (!(isLiteral(values) || isNamedNode(values)) || !values.equals(value)) {
                    this.set(property, new Set<MetadataPropertyValue>([values, value]))
                }
            } else {
                this.set(property, new Set<MetadataPropertyValue>([value]))
            }
        } else {
            this.set(property, value)
        }
    }
}

//==============================================================================
