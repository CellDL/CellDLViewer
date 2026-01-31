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
import type { StringProperties } from '@viewer/common/types'
import type { Extent } from '@viewer/geometry'
import { lengthToPixels } from '@viewer/geometry/units'

//==============================================================================

export const SVG_URI = 'http://www.w3.org/2000/svg'

//==============================================================================

export interface INodeStyle {
    gradientFill: boolean
    colours: string[]
    direction?: string
}

export interface IPathStyle {
    colour: string   // defaut is CONNECTION_COLOUR (with opacity of 0.7)
    width: number    // default is CONNECTION_WIDTH (but +2 when selected)
    dashed: boolean  // set `dashed` class`
}

//==============================================================================

export interface LatexMathSvgOptions {
    background?: string|string[]
    border?: string
    'border-width'?: string
    class?: string
    'corner-radius'?: string
    'middle-colour'?: string
    'min-height'?: string
    'min-width'?: string
    padding?: string
    'vertical-align'?: string
}

//==============================================================================

export function svgSize(svgDocument: Document): PointLike | null {
    const svgElement = svgDocument.documentElement
    const width = lengthToPixels(svgElement.getAttribute('width'))
    const height = lengthToPixels(svgElement.getAttribute('height'))
    if (width && height) {
        return {
            x: width,
            y: height
        }
    }
    return null
}

export function getViewbox(svgElement: SVGGraphicsElement): Extent {
    return svgElement
        .getAttribute('viewBox')
        ?.split(' ')
        .map((n) => +n) as Extent
}

//==============================================================================

type Attributes = StringProperties

export function createSVGElement(tagName: string, attributes: Attributes): SVGElement {
    const element = document.createElementNS(SVG_URI, tagName)
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value)
    }
    return element
}

function attributePairs(attributes: Attributes): string {
    const attributePairs: string[] = []
    for (const [key, value] of Object.entries(attributes)) {
        attributePairs.push(` ${key}="${value}"`)
    }
    return attributePairs.join('')
}

//==============================================================================

function svgCircleAttributes(c: PointLike, r: number, attributes: Attributes): Attributes {
    return Object.assign({}, attributes, {
        cx: `${c.x}`,
        cy: `${c.y}`,
        r: `${r}`
    })
}

export function svgCircle(centre: PointLike, radius: number, attributes: Attributes = {}): string {
    return `<circle${attributePairs(svgCircleAttributes(centre, radius, attributes))}/>`
}

export function svgCircleElement(centre: PointLike, radius: number, attributes: Attributes = {}): SVGCircleElement {
    return createSVGElement('circle', svgCircleAttributes(centre, radius, attributes)) as SVGCircleElement
}

//==============================================================================

export function svgPath(points: PointLike[], attributes: Attributes = {}): string {
    const description = svgPathDescription(points)
    return description ? `<path${attributePairs(attributes)} d="${description}"/>` : ''
}

export function svgPathDescription(points: PointLike[]): string {
    const pts = points.map((pt) => `${pt.x},${pt.y}`)
    return pts.length > 1 ? `M${pts.join(' L')}` : ''
}

export function svgPathElement(points: PointLike[], attributes: Attributes = {}): SVGPathElement {
    const description = svgPathDescription(points)
    return createSVGElement('path', Object.assign({}, attributes, { d: description })) as SVGPathElement
}

//==============================================================================

function svgRectAttributes(tl: PointLike, br: PointLike, attributes: Attributes): Attributes {
    return Object.assign({}, attributes, {
        x: `${Math.min(tl.x, br.x)}`,
        y: `${Math.min(tl.y, br.y)}`,
        width: `${Math.abs(br.x - tl.x)}`,
        height: `${Math.abs(br.y - tl.y)}`
    })
}

export function svgRect(topLeft: PointLike, bottomRight: PointLike, attributes: Attributes = {}): string {
    return `<rect${attributePairs(svgRectAttributes(topLeft, bottomRight, attributes))}/>`
}

export function svgRectElement(
    topLeft: PointLike,
    bottomRight: PointLike,
    attributes: StringProperties = {}
): SVGRectElement {
    return createSVGElement('rect', svgRectAttributes(topLeft, bottomRight, attributes)) as SVGRectElement
}

//==============================================================================
//==============================================================================

//  Minimal CSS needed for stand-alone image
export const LatexStyleRules = [
    'svg {color: black}', // default value of ``currentColor``
    'svg a{fill:blue;stroke:blue}',
    // Round the corners of filled background rectangles
    '[data-mml-node="mstyle"]>rect[data-bgcolor="true"]{rx: 8%; ry: 12%}',
    '[data-mml-node="merror"]>g{fill:red;stroke:red}',
    '[data-mml-node="merror"]>rect[data-background]{fill:yellow;stroke:none}',
    '[data-frame],[data-line]{stroke-width:70px;fill:none}',
    '.mjx-dashed{stroke-dasharray:140}',
    '.mjx-dotted{stroke-linecap:round;stroke-dasharray:0,140}',
    'use[data-c]{stroke-width:3px}'
].join('')

//==============================================================================

export function base64Svg(svg: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

//==============================================================================

export function getSvgImageFromBase64(svgText: string): string|undefined {
    const base64 = svgText.match(/data:image\/svg\+xml;base64,(?<base64>.*)/)
    if (base64) {
        return Buffer.from(base64.groups!.base64!, 'base64').toString('utf8')
    }
}
//==============================================================================
//==============================================================================
