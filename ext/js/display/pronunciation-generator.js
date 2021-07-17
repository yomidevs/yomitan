/*
 * Copyright (C) 2021  Yomichan Authors
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

class PronunciationGenerator {
    constructor(japaneseUtil) {
        this._japaneseUtil = japaneseUtil;
    }

    createPitchAccentHtml(morae, downstepPosition, nasalPositions, devoicePositions) {
        const jp = this._japaneseUtil;
        const nasalPositionsSet = nasalPositions.length > 0 ? new Set(nasalPositions) : null;
        const devoicePositionsSet = devoicePositions.length > 0 ? new Set(devoicePositions) : null;
        const fragment = document.createDocumentFragment();
        for (let i = 0, ii = morae.length; i < ii; ++i) {
            const i1 = i + 1;
            const mora = morae[i];
            const highPitch = jp.isMoraPitchHigh(i, downstepPosition);
            const highPitchNext = jp.isMoraPitchHigh(i1, downstepPosition);
            const nasal = nasalPositionsSet !== null && nasalPositionsSet.has(i1);
            const devoice = devoicePositionsSet !== null && devoicePositionsSet.has(i1);

            const n1 = document.createElement('span');
            n1.className = 'pitch-accent-character';

            const n2 = document.createElement('span');
            n2.className = 'pitch-accent-character-inner';

            n1.appendChild(n2);

            n1.dataset.position = `${i}`;
            n1.dataset.pitch = highPitch ? 'high' : 'low';
            n1.dataset.pitchNext = highPitchNext ? 'high' : 'low';
            n2.textContent = mora;

            if (devoice) {
                n1.dataset.devoice = 'true';
                const n3 = document.createElement('span');
                n3.className = 'pitch-accent-character-devoice-indicator';
                n1.appendChild(n3);
            }
            if (nasal) {
                n1.dataset.nasal = 'true';
                const n3 = document.createElement('span');
                n3.className = 'pitch-accent-character-nasal-indicator';
                n1.appendChild(n3);
            }

            fragment.appendChild(n1);
        }
        return fragment;
    }

    createPitchGraph(morae, downstepPosition) {
        const jp = this._japaneseUtil;
        const ii = morae.length;

        const svgns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgns, 'svg');
        svg.setAttribute('xmlns', svgns);
        svg.setAttribute('class', 'pitch-accent-graph');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('viewBox', `0 0 ${50 * (ii + 1)} 100`);

        if (ii <= 0) { return svg; }

        const path1 = document.createElementNS(svgns, 'path');
        svg.appendChild(path1);

        const path2 = document.createElementNS(svgns, 'path');
        svg.appendChild(path2);

        const pathPoints = [];
        for (let i = 0; i < ii; ++i) {
            const highPitch = jp.isMoraPitchHigh(i, downstepPosition);
            const highPitchNext = jp.isMoraPitchHigh(i + 1, downstepPosition);
            const x = i * 50 + 25;
            const y = highPitch ? 25 : 75;
            if (highPitch && !highPitchNext) {
                this._addGraphDotDownstep(svg, svgns, x, y);
            } else {
                this._addGraphDot(svg, svgns, x, y);
            }
            pathPoints.push(`${x} ${y}`);
        }

        path1.setAttribute('class', 'pitch-accent-graph-line');
        path1.setAttribute('d', `M${pathPoints.join(' L')}`);

        pathPoints.splice(0, ii - 1);
        {
            const highPitch = jp.isMoraPitchHigh(ii, downstepPosition);
            const x = ii * 50 + 25;
            const y = highPitch ? 25 : 75;
            this._addGraphTriangle(svg, svgns, x, y);
            pathPoints.push(`${x} ${y}`);
        }

        path2.setAttribute('class', 'pitch-accent-graph-line-tail');
        path2.setAttribute('d', `M${pathPoints.join(' L')}`);

        return svg;
    }

    // Private

    _addGraphDot(container, svgns, x, y) {
        container.appendChild(this._createGraphCircle(svgns, 'pitch-accent-graph-dot', x, y, '15'));
    }

    _addGraphDotDownstep(container, svgns, x, y) {
        container.appendChild(this._createGraphCircle(svgns, 'pitch-accent-graph-dot-downstep1', x, y, '15'));
        container.appendChild(this._createGraphCircle(svgns, 'pitch-accent-graph-dot-downstep2', x, y, '5'));
    }

    _addGraphTriangle(container, svgns, x, y) {
        const node = document.createElementNS(svgns, 'path');
        node.setAttribute('class', 'pitch-accent-graph-triangle');
        node.setAttribute('d', 'M0 13 L15 -13 L-15 -13 Z');
        node.setAttribute('transform', `translate(${x},${y})`);
        container.appendChild(node);
    }

    _createGraphCircle(svgns, className, x, y, radius) {
        const node = document.createElementNS(svgns, 'circle');
        node.setAttribute('class', className);
        node.setAttribute('cx', `${x}`);
        node.setAttribute('cy', `${y}`);
        node.setAttribute('r', radius);
        return node;
    }
}
