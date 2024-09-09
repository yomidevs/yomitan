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

export type DocumentUtilTestData = {
    caretRangeFromPointSelector: string;
    elementFromPointSelector: string;
    endNodeSelector: string;
    endOffset: number;
    hasImposter: boolean | undefined;
    resultType: string;
    sentence: string;
    sentenceScanExtent: number;
    startNodeSelector: string;
    startOffset: number;
    terminateAtNewlines: boolean | undefined;
};

export type DOMTextScannerTestData = {
    expectedResultContent: string[];
    expectedResultNodeIsText: boolean;
    expectedResultNodeSelector: string;
    expectedResultOffset: number;
    seekDirection: string;
    seekLength: number;
    seekNodeIsText: boolean;
    seekNodeSelector: string;
    seekOffset: number;
};
