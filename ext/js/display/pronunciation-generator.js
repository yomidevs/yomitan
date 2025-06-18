/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {getDownstepPositions, getKanaDiacriticInfo, isMoraPitchHigh} from '../language/ja/japanese.js';

export class PronunciationGenerator {
    /**
     * Creates a new instance of the class.
     * @param {Document} document
     */
    constructor(document) {
        /** @type {Document} */
        this._document = document;
    }

    /**
     * @param {string[]} morae
     * @param {number | string} pitchPositions
     * @param {number[]} nasalPositions
     * @param {number[]} devoicePositions
     * @returns {HTMLSpanElement}
     */
    createPronunciationText(morae, pitchPositions, nasalPositions, devoicePositions) {
        const nasalPositionsSet = nasalPositions.length > 0 ? new Set(nasalPositions) : null;
        const devoicePositionsSet = devoicePositions.length > 0 ? new Set(devoicePositions) : null;
        const container = this._document.createElement('span');
        container.className = 'pronunciation-text';
        for (let i = 0, ii = morae.length; i < ii; ++i) {
            const i1 = i + 1;
            const mora = morae[i];
            const highPitch = isMoraPitchHigh(i, pitchPositions);
            const highPitchNext = isMoraPitchHigh(i1, pitchPositions);
            const nasal = nasalPositionsSet !== null && nasalPositionsSet.has(i1);
            const devoice = devoicePositionsSet !== null && devoicePositionsSet.has(i1);

            const n1 = this._document.createElement('span');
            n1.className = 'pronunciation-mora';
            n1.dataset.position = `${i}`;
            n1.dataset.pitch = highPitch ? 'high' : 'low';
            n1.dataset.pitchNext = highPitchNext ? 'high' : 'low';

            const characterNodes = [];
            for (const character of mora) {
                const n2 = this._document.createElement('span');
                n2.className = 'pronunciation-character';
                n2.textContent = character;
                n1.appendChild(n2);
                characterNodes.push(n2);
            }

            if (devoice) {
                n1.dataset.devoice = 'true';
                const n3 = this._document.createElement('span');
                n3.className = 'pronunciation-devoice-indicator';
                n1.appendChild(n3);
            }
            if (nasal && characterNodes.length > 0) {
                n1.dataset.nasal = 'true';

                const group = this._document.createElement('span');
                group.className = 'pronunciation-character-group';

                const n2 = characterNodes[0];
                const character = /** @type {string} */ (n2.textContent);

                const characterInfo = getKanaDiacriticInfo(character);
                if (characterInfo !== null) {
                    n1.dataset.originalText = mora;
                    n2.dataset.originalText = character;
                    n2.textContent = characterInfo.character;
                }

                let n3 = this._document.createElement('span');
                n3.className = 'pronunciation-nasal-diacritic';
                n3.textContent = '\u309a'; // Combining handakuten
                group.appendChild(n3);

                n3 = this._document.createElement('span');
                n3.className = 'pronunciation-nasal-indicator';
                group.appendChild(n3);

                /** @type {ParentNode} */ (n2.parentNode).replaceChild(group, n2);
                group.insertBefore(n2, group.firstChild);
            }

            const line = this._document.createElement('span');
            line.className = 'pronunciation-mora-line';
            n1.appendChild(line);

            container.appendChild(n1);
        }
        return container;
    }

    /**
     * @param {string[]} morae
     * @param {number | string} pitchPositions
     * @returns {SVGSVGElement}
     */
    createPronunciationGraph(morae, pitchPositions) {
        const ii = morae.length;

        const svgns = 'http://www.w3.org/2000/svg';
        const svg = this._document.createElementNS(svgns, 'svg');
        svg.setAttribute('xmlns', svgns);
        svg.setAttribute('class', 'pronunciation-graph');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('viewBox', `0 0 ${50 * (ii + 1)} 100`);

        if (ii <= 0) { return svg; }

        const path1 = this._document.createElementNS(svgns, 'path');
        svg.appendChild(path1);

        const path2 = this._document.createElementNS(svgns, 'path');
        svg.appendChild(path2);

        const pathPoints = [];
        for (let i = 0; i < ii; ++i) {
            const highPitch = isMoraPitchHigh(i, pitchPositions);
            const highPitchNext = isMoraPitchHigh(i + 1, pitchPositions);
            const x = i * 50 + 25;
            const y = highPitch ? 25 : 75;
            if (highPitch && !highPitchNext) {
                this._addGraphDotDownstep(svg, svgns, x, y);
            } else {
                this._addGraphDot(svg, svgns, x, y);
            }
            pathPoints.push(`${x} ${y}`);
        }

        path1.setAttribute('class', 'pronunciation-graph-line');
        path1.setAttribute('d', `M${pathPoints.join(' L')}`);

        pathPoints.splice(0, ii - 1);
        {
            const highPitch = isMoraPitchHigh(ii, pitchPositions);
            const x = ii * 50 + 25;
            const y = highPitch ? 25 : 75;
            this._addGraphTriangle(svg, svgns, x, y);
            pathPoints.push(`${x} ${y}`);
        }

        path2.setAttribute('class', 'pronunciation-graph-line-tail');
        path2.setAttribute('d', `M${pathPoints.join(' L')}`);

        return svg;
    }

    /**
     * @param {number | string} downstepPositions
     * @returns {HTMLSpanElement}
     */
    createPronunciationDownstepPosition(downstepPositions) {
        const downsteps = typeof downstepPositions === 'string' ? getDownstepPositions(downstepPositions) : downstepPositions;
        const downstepPositionString = `${downsteps}`;

        const n1 = this._document.createElement('span');
        n1.className = 'pronunciation-downstep-notation';
        n1.dataset.downstepPosition = downstepPositionString;

        let n2 = this._document.createElement('span');
        n2.className = 'pronunciation-downstep-notation-prefix';
        n2.textContent = '[';
        n1.appendChild(n2);

        n2 = this._document.createElement('span');
        n2.className = 'pronunciation-downstep-notation-number';
        n2.textContent = downstepPositionString;
        n1.appendChild(n2);

        n2 = this._document.createElement('span');
        n2.className = 'pronunciation-downstep-notation-suffix';
        n2.textContent = ']';
        n1.appendChild(n2);

        return n1;
    }

    // The following Jidoujisho pitch graph code is based on code from
    // https://github.com/lrorpilla/jidoujisho licensed under the
    // GNU General Public License v3.0

    /**
     * Create a pronounciation graph in the style of Jidoujisho
     * @param {string[]} mora
     * @param {number | string} pitchPositions
     * @returns {SVGSVGElement}
     */
    createPronunciationGraphJJ(mora, pitchPositions) {
        const patt = this._pitchValueToPattJJ(mora.length, pitchPositions);

        const positions = Math.max(mora.length, patt.length);
        const stepWidth = 35;
        const marginLr = 16;
        const svgWidth = Math.max(0, ((positions - 1) * stepWidth) + (marginLr * 2));

        const svgns = 'http://www.w3.org/2000/svg';
        const svg = this._document.createElementNS(svgns, 'svg');
        svg.setAttribute('xmlns', svgns);
        svg.setAttribute('width', `${(svgWidth * (3 / 5))}px`);
        svg.setAttribute('height', '45px');
        svg.setAttribute('viewBox', `0 0 ${svgWidth} 75`);


        if (mora.length <= 0) { return svg; }

        for (let i = 0; i < mora.length; i++) {
            const xCenter = marginLr + (i * stepWidth);
            this._textJJ(xCenter - 11, mora[i], svgns, svg);
        }


        let pathType = '';

        const circles = [];
        const paths = [];

        let prevCenter = [-1, -1];
        for (let i = 0; i < patt.length; i++) {
            const xCenter = marginLr + (i * stepWidth);
            const accent = patt[i];
            let yCenter = 0;
            if (accent === 'H') {
                yCenter = 5;
            } else if (accent === 'L') {
                yCenter = 30;
            }
            circles.push(this._circleJJ(xCenter, yCenter, i >= mora.length, svgns));


            if (i > 0) {
                if (prevCenter[1] === yCenter) {
                    pathType = 's';
                } else if (prevCenter[1] < yCenter) {
                    pathType = 'd';
                } else if (prevCenter[1] > yCenter) {
                    pathType = 'u';
                }
                paths.push(this._pathJJ(prevCenter[0], prevCenter[1], pathType, stepWidth, svgns));
            }
            prevCenter = [xCenter, yCenter];
        }

        for (const path of paths) {
            svg.appendChild(path);
        }

        for (const circle of circles) {
            svg.appendChild(circle);
        }

        return svg;
    }


    // Private

    /**
     * @param {Element} container
     * @param {string} svgns
     * @param {number} x
     * @param {number} y
     */
    _addGraphDot(container, svgns, x, y) {
        container.appendChild(this._createGraphCircle(svgns, 'pronunciation-graph-dot', x, y, '15'));
    }

    /**
     * @param {Element} container
     * @param {string} svgns
     * @param {number} x
     * @param {number} y
     */
    _addGraphDotDownstep(container, svgns, x, y) {
        container.appendChild(this._createGraphCircle(svgns, 'pronunciation-graph-dot-downstep1', x, y, '15'));
        container.appendChild(this._createGraphCircle(svgns, 'pronunciation-graph-dot-downstep2', x, y, '5'));
    }

    /**
     * @param {Element} container
     * @param {string} svgns
     * @param {number} x
     * @param {number} y
     */
    _addGraphTriangle(container, svgns, x, y) {
        const node = this._document.createElementNS(svgns, 'path');
        node.setAttribute('class', 'pronunciation-graph-triangle');
        node.setAttribute('d', 'M0 13 L15 -13 L-15 -13 Z');
        node.setAttribute('transform', `translate(${x},${y})`);
        container.appendChild(node);
    }

    /**
     * @param {string} svgns
     * @param {string} className
     * @param {number} x
     * @param {number} y
     * @param {string} radius
     * @returns {Element}
     */
    _createGraphCircle(svgns, className, x, y, radius) {
        const node = this._document.createElementNS(svgns, 'circle');
        node.setAttribute('class', className);
        node.setAttribute('cx', `${x}`);
        node.setAttribute('cy', `${y}`);
        node.setAttribute('r', radius);
        return node;
    }

    /**
     * Get H&L pattern
     * @param {number} numberOfMora
     * @param {number | string} pitchValue
     * @returns {string}
     */
    _pitchValueToPattJJ(numberOfMora, pitchValue) {
        if (typeof pitchValue === 'string') { return pitchValue + pitchValue[pitchValue.length - 1]; }
        if (numberOfMora >= 1) {
            if (pitchValue === 0) {
                // Heiban
                return `L${'H'.repeat(numberOfMora)}`;
            } else if (pitchValue === 1) {
                // Atamadaka
                return `H${'L'.repeat(numberOfMora)}`;
            } else if (pitchValue >= 2) {
                const stepdown = pitchValue - 2;
                return `LH${'H'.repeat(stepdown)}${'L'.repeat(numberOfMora - pitchValue + 1)}`;
            }
        }
        return '';
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} o
     * @param {string} svgns
     * @returns {Element}
     */
    _circleJJ(x, y, o, svgns) {
        if (o) {
            const node = this._document.createElementNS(svgns, 'circle');

            node.setAttribute('r', '4');
            node.setAttribute('cx', `${(x + 4)}`);
            node.setAttribute('cy', `${y}`);
            node.setAttribute('stroke', 'currentColor');
            node.setAttribute('stroke-width', '2');
            node.setAttribute('fill', 'none');

            return node;
        } else {
            const node = this._document.createElementNS(svgns, 'circle');

            node.setAttribute('r', '5');
            node.setAttribute('cx', `${x}`);
            node.setAttribute('cy', `${y}`);
            node.setAttribute('style', 'opacity:1;fill:currentColor;');

            return node;
        }
    }

    /**
     * @param {number} x
     * @param {string} mora
     * @param {string} svgns
     * @param {SVGSVGElement} svg
     * @returns {void}
     */
    _textJJ(x, mora, svgns, svg) {
        if (mora.length === 1) {
            const path = this._document.createElementNS(svgns, 'text');
            path.setAttribute('x', `${x}`);
            path.setAttribute('y', '67.5');
            path.setAttribute('style', 'font-size:20px;font-family:sans-serif;fill:currentColor;');
            path.textContent = mora;
            svg.appendChild(path);
        } else {
            const path1 = this._document.createElementNS(svgns, 'text');
            path1.setAttribute('x', `${x - 5}`);
            path1.setAttribute('y', '67.5');
            path1.setAttribute('style', 'font-size:20px;font-family:sans-serif;fill:currentColor;');
            path1.textContent = mora[0];
            svg.appendChild(path1);


            const path2 = this._document.createElementNS(svgns, 'text');
            path2.setAttribute('x', `${x + 12}`);
            path2.setAttribute('y', '67.5');
            path2.setAttribute('style', 'font-size:14px;font-family:sans-serif;fill:currentColor;');
            path2.textContent = mora[1];
            svg.appendChild(path2);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {string} type
     * @param {number} stepWidth
     * @param {string} svgns
     * @returns {Element}
     */
    _pathJJ(x, y, type, stepWidth, svgns) {
        let delta = '';
        switch (type) {
            case 's':
                delta = stepWidth + ',0';
                break;
            case 'u':
                delta = stepWidth + ',-25';
                break;
            case 'd':
                delta = stepWidth + ',25';
                break;
        }

        const path = this._document.createElementNS(svgns, 'path');
        path.setAttribute('d', `m ${x},${y} ${delta}`);
        path.setAttribute('style', 'fill:none;stroke:currentColor;stroke-width:1.5;');

        return path;
    }
}
