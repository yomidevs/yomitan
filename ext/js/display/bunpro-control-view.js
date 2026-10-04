/*
 * Copyright (C) 2026  Yomitan Authors
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

/** @type {import('display-bunpro').ControlView} */
const NONE = {kind: 'none'};
/** @type {import('display-bunpro').ControlView} */
const RESERVED = {kind: 'reserved'};

/**
 * @param {import('display-bunpro').State} state
 * @param {number} entryIndex
 * @returns {import('display-bunpro').ControlView}
 */
export function getControlView(state, entryIndex) {
    switch (state.phase) {
        case 'off':
        case 'unavailable':
            return NONE;
        case 'loading':
            return (state.entryQueries[entryIndex] ?? null) === null ? NONE : RESERVED;
        case 'ready':
            return getMatchView(state, entryIndex);
    }
}

/**
 * @param {Extract<import('display-bunpro').State, {phase: 'ready'}>} state
 * @param {number} entryIndex
 * @returns {import('display-bunpro').ControlView}
 */
function getMatchView({entryItems, items, attempts, pending}, entryIndex) {
    if (pending?.[entryIndex] === true) { return RESERVED; }
    const key = entryItems[entryIndex] ?? null;
    const match = key === null ? void 0 : items.get(key);
    if (key === null || typeof match === 'undefined') { return NONE; }
    if (match.inReviews) { return createButtonView('check', false, match, 'In your Bunpro reviews'); }
    const attempt = attempts.get(key);
    if (typeof attempt === 'undefined') { return createButtonView('plus', false, match, 'Add to Bunpro reviews'); }
    switch (attempt.state) {
        case 'adding': return createButtonView('plus', true, match, 'Adding to Bunpro reviews');
        case 'failed': return createButtonView('plus', false, match, attempt.error);
    }
}

/**
 * @param {'plus'|'check'} mark
 * @param {boolean} busy
 * @param {import('bunpro').BunproMatch} match
 * @param {string} statusTitle
 * @returns {import('display-bunpro').ControlView}
 */
function createButtonView(mark, busy, match, statusTitle) {
    return {kind: 'button', mark, busy, level: match.level, statusTitle, href: vocabPageUrl(match)};
}

/**
 * @param {import('bunpro').BunproMatch} match
 * @returns {string}
 */
function vocabPageUrl(match) {
    if (match.kind !== 'vocab') { return ''; }
    return `https://bunpro.jp/vocabs/${encodeURIComponent(match.written)}`;
}
