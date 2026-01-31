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
    applyToPoint,
    applyToPoints,
    compose,
    fromString,
    identity,
    inverse,
    type Matrix,
    toString as transformToString,
    translate
} from 'transformation-matrix'

//==============================================================================

import { Point, type PointLike } from '@viewer/common/points'

//==============================================================================

export class Transform {
    #matrix: Matrix

    constructor(matrix: Matrix) {
        this.#matrix = matrix
    }

    static fromString(matrix: string): Transform {
        if (matrix === '' || matrix === 'none') {
            return new Transform(identity())
        } else {
            return new Transform(fromString(matrix))
        }
    }

    static Identity(): Transform {
        return new Transform(identity())
    }

    get isIdentity(): boolean {
        return transformToString(this.#matrix) === transformToString(identity())
    }

    inverse(): Transform {
        return new Transform(inverse(this.#matrix))
    }

    leftMultiply(transform: Transform): Transform {
        return new Transform(compose([transform.#matrix, this.#matrix]))
    }

    toString(): string {
        return transformToString(this.#matrix)
    }

    transformPoint(point: PointLike): Point {
        return Point.fromPoint(applyToPoint(this.#matrix, point))
    }

    transformPoints(points: PointLike[]): Point[] {
        return applyToPoints(this.#matrix, points).map((pt) => Point.fromPoint(pt))
    }

    static Translate(tx: number, ty: number): Transform {
        return new Transform(translate(tx, ty))
    }
}

//==============================================================================
