/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import type {Summary} from '../ext/dictionary-importer';
import type {Tag, MatchType, TermMetaType, KanjiMetaType, TermExactRequest, DictionaryCounts} from '../ext/dictionary-database';

export type DatabaseTestData = {
    expectedCounts: DictionaryCounts;
    expectedSummary: Summary;
    tests: {
        findKanjiBulk: FindKanjiBulkTestCase[];
        findKanjiMetaBulk: FindKanjiMetaBulkTestCase[];
        findTagForTitle: FindTagForTitleTestCase[];
        findTermMetaBulk: FindTermMetaBulkTestCase[];
        findTermsBulk: FindTermsBulkTestCase[];
        findTermsBySequenceBulk: FindTermsBySequenceBulkTestCase[];
        findTermsExactBulk: FindTermsExactBulkTestCase[];
    };
};

export type ItemCount<TKey = unknown> = [key: TKey, count: number];

export type FindTermsBulkTestCase = {
    expectedResults: {
        readings: ItemCount<string>[];
        terms: ItemCount<string>[];
        total: number;
    };
    inputs: {
        matchType: MatchType;
        termList: string[];
    }[];
};

export type FindTermsExactBulkTestCase = {
    expectedResults: {
        readings: ItemCount<string>[];
        terms: ItemCount<string>[];
        total: number;
    };
    inputs: {
        termList: TermExactRequest[];
    }[];
};

export type FindTermsBySequenceBulkTestCase = {
    expectedResults: {
        readings: ItemCount<string>[];
        terms: ItemCount<string>[];
        total: number;
    };
    inputs: {
        sequenceList: number[];
    }[];
};

export type FindTermMetaBulkTestCase = {
    expectedResults: {
        modes: ItemCount<TermMetaType>[];
        total: number;
    };
    inputs: {
        termList: string[];
    }[];
};

export type FindKanjiBulkTestCase = {
    expectedResults: {
        kanji: ItemCount<string>[];
        total: number;
    };
    inputs: {
        kanjiList: string[];
    }[];
};

export type FindKanjiMetaBulkTestCase = {
    expectedResults: {
        modes: ItemCount<KanjiMetaType>[];
        total: number;
    };
    inputs: {
        kanjiList: string[];
    }[];
};

export type FindTagForTitleTestCase = {
    expectedResults: {
        value: null | Tag;
    };
    inputs: {
        name: string;
    }[];
};
