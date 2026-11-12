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

export type ReviewableKind = 'vocab' | 'grammar';

export type ReviewableId = number & {readonly __brand: 'BunproReviewableId'};

export type BunproQuery = {
    term: string;
    reading: string;
    /** JMdict `ent_seq` when a sequenced dict (e.g. Jitendex) provided one; omit for term search. */
    jmdictId?: number;
};

/** How the vocab can be studied on Bunpro. `null` until classified. */
export type StudyMode = 'cloze' | 'sentences' | 'translation';

export type BunproMatch = {
    id: ReviewableId;
    kind: ReviewableKind;
    /** Bunpro page slug (`barbed-wire`, `国`, …). */
    slug: string;
    written: string;
    reading: string;
    level: string | null;
    inReviews: boolean;
    /** From included study questions; omit/`null` until fetched. */
    studyMode?: StudyMode | null;
};

export type BunproStatus = 'disabled' | 'signedOut' | 'ready';

/** What the settings page may know. The API key itself stays in the background. */
export type BunproAuthorization = {
    status: BunproStatus;
    /** An API key is saved on this device. */
    saved: boolean;
    /** Character length of the saved key, for masking in settings. */
    tokenLength: number | null;
};

export type BunproLookup =
    | {status: 'ready', matches: (BunproMatch | null)[]}
    | {status: Exclude<BunproStatus, 'ready'>};

/** `${kind}:${id}`, built only by `itemKey`. */
export type ItemKey = string & {readonly __brand: 'BunproItemKey'};

export type KindWire = {
    /** Key of this kind's JSON:API document in the search response. */
    searchKey: string;
    /** JSON:API record type of this kind's data entries, or null when any non-review record counts. */
    recordType: string | null;
    /** Type name in `[type, id]` reviewable tuples and in `review.reviewable_type`. */
    reviewable: string;
};

export type ClientPorts = {
    fetch: (url: string, init: RequestInit) => Promise<Response>;
    readStoredToken: () => Promise<string | null>;
    writeStoredToken: (token: string | null) => Promise<void>;
    /** How long one Bunpro request may run before it is abandoned. Defaults to 8 seconds. */
    searchTimeoutMs?: number;
};

export type Session =
    | {status: 'ready', token: string}
    | {status: Exclude<BunproStatus, 'ready'>};
