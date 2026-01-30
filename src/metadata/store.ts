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

import {
    blankNode,
    isBlankNode,
    isLiteral,
    isNamedNode,
    MetadataPropertiesMap,
    type MetadataPropertyValue,
    type ContentType,
    type NamedNode,
    type Statement
} from './index'

import type { SubjectType, PredicateType, ObjectType } from './index'

//==============================================================================

import { RDF } from './namespaces'

//==============================================================================

export interface PredicateValue {
    predicate: PredicateType
    object: ObjectType
}

//==============================================================================

export abstract class BaseStore {

    abstract add(s: SubjectType, p: PredicateType, o: ObjectType, g: NamedNode | null): Statement

    abstract contains(
        s: SubjectType | null,
        p: PredicateType | null,
        o: ObjectType | null,
        g: NamedNode | null
    ): boolean

    abstract load(baseIri: string|null, rdf: string, contentType: ContentType, graph: NamedNode|null): void

    abstract removeStatements(
        s: SubjectType | null,
        p: PredicateType | null,
        o: ObjectType | null,
        g: NamedNode | null
    ): void

    abstract serialise(
        baseIri: string,
        contentType: ContentType,
        namespaces: Record<string, string>,
        graph: NamedNode | null
    ): Promise<string>

    abstract query(sparql: string, all_graphs: boolean): Map<string, unknown>[]

    abstract statements(graph: NamedNode | null): Statement[]

    abstract statementsMatching(
        s: SubjectType | null,
        p: PredicateType | null,
        o: ObjectType | null,
        g: NamedNode | null
    ): Statement[]

    abstract subjectsOfType(parentType: NamedNode): [SubjectType, NamedNode][]

    abstract update(sparql: string): void

    addMetadataPropertiesForSubject(subject: SubjectType, properties: MetadataPropertiesMap) {
        const statements: Statement[] = []
        for (const [predicate, value] of properties.predicateValues()) {
            statements.push(...this.#addMetadataProperties(subject, predicate, value))
        }
        return statements
    }

    #addMetadataProperties(subject: SubjectType, predicate: PredicateType, value: MetadataPropertyValue): Statement[] {
        const statements: Statement[] = []
        if (isLiteral(value) || isNamedNode(value)) {
            // @ts-expect-error: value is a Literal or NamedNode
            statements.push(this.add(subject, predicate, value))
        } else if (value instanceof MetadataPropertiesMap) {
            const node = blankNode()
            statements.push(this.add(subject, predicate, node, null))
            statements.push(...this.addMetadataPropertiesForSubject(node, value))
        } else if (Array.isArray(value) && value.length > 0) {
            const node = blankNode()
            statements.push(this.add(subject, predicate, node, null))
            this.#addListAsCollection(node, value) // ??
        } else if (value instanceof Set) {
            for (const v of value.values()) {
                statements.push(...this.#addMetadataProperties(subject, predicate, v))
            }
        }
        return statements
    }

    addStatementList(statements: Statement[]) {
        statements.forEach((s) => {
            this.add(s.subject, s.predicate, s.object, null)
        })
    }

    metadataFromPredicates(predicateValues: PredicateValue[]): MetadataPropertiesMap {
        const metadata = new MetadataPropertiesMap()
        for (const predicateValue of predicateValues) {
            const value = this.#metadataValue(predicateValue.object)
            if (value) {
                metadata.setProperty(predicateValue.predicate, value, true)
            }
        }
        return metadata
    }

    metadataPropertiesForSubject(subject: SubjectType): MetadataPropertiesMap {
        const predicateValues = this.statementsMatching(subject, null, null, null) as PredicateValue[]
        return this.metadataFromPredicates(predicateValues)
    }

    removeStatementList(statements: Statement[]) {
        statements.forEach((s) => {
            this.removeStatements(s.subject, s.predicate, s.object, null)
        })
    }

    #metadataValue(value: ObjectType): MetadataPropertyValue | null {
        if (isLiteral(value) || isNamedNode(value)) {
            // @ts-expect-error: `value` is a Literal or NamedNode
            return value
        } else if (isBlankNode(value)) {
            // @ts-expect-error: value is a BlankNode
            if (this.contains(value, RDF.uri('rest'), null)) {
                // @ts-expect-error: `value` is a BlankNode
                return this.#listFromCollection(value)
            } else {
                // @ts-expect-error: `value` is a BlankNode
                return this.metadataPropertiesForSubject(value)
            }
        }
        return null
    }

    #listFromCollection(subject: SubjectType): MetadataPropertyValue[] {
        // Based on https://github.com/ontola/rdfdev-js/blob/master/packages/collections/src/list.ts
        const result: MetadataPropertyValue[] = []
        const nodes = [subject.value]
        let next = subject
        while (next && !next.equals(RDF.uri('nil'))) {
            const headItem = this.statementsMatching(next, RDF.uri('first'), null, null)
            if (headItem.length !== 1 || headItem[0] === undefined) break
            const value = this.#metadataValue(headItem[0].object)
            if (!value) break
            result.push(value)
            const nextItem = this.statementsMatching(next, RDF.uri('rest'), null, null)
            if (nextItem.length !== 1 || nextItem[0] === undefined) break
            next = nextItem[0].object as NamedNode
            if (nodes.includes(next.value)) {
                break
            }
            nodes.push(next.value)
        }
        return result
    }

    #addListAsCollection(subject: SubjectType, values: MetadataPropertyValue[]): Statement[] {
        const statements: Statement[] = []
        let current = subject
        values.forEach((value, index) => {
            statements.push(...this.#addMetadataProperties(current, RDF.uri('first'), value))
            if (index < values.length - 1) {
                const next = blankNode()
                statements.push(this.add(current, RDF.uri('rest'), next, null))
                current = next
            }
        })
        statements.push(this.add(current, RDF.uri('rest'), RDF.uri('nil'), null))
        return statements
    }
}

//==============================================================================
//==============================================================================
