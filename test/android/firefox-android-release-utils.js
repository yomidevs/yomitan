/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

const stableFirefoxAndroidVersionPattern = /^\d+\.\d+(?:\.\d+)?$/;

/**
 * @param {string} value
 * @returns {number[]}
 */
function parseVersion(value) {
    return value.split('.').map((part) => Number.parseInt(part, 10));
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareFirefoxAndroidReleaseVersions(a, b) {
    const aParts = parseVersion(a);
    const bParts = parseVersion(b);
    const length = Math.max(aParts.length, bParts.length);
    for (let index = 0; index < length; index += 1) {
        const aValue = aParts[index] ?? 0;
        const bValue = bParts[index] ?? 0;
        if (aValue !== bValue) {
            return aValue - bValue;
        }
    }
    return 0;
}

/**
 * @param {string} href
 * @param {string} baseUrl
 * @returns {string}
 */
function extractLastPathSegment(href, baseUrl) {
    try {
        const url = new URL(href, baseUrl);
        const parts = url.pathname.split('/').filter((part) => part.length > 0);
        return parts.at(-1) ?? '';
    } catch {
        return '';
    }
}

/**
 * @param {string} listingHtml
 * @param {string} baseUrl
 * @returns {string[]}
 */
export function extractFirefoxAndroidStableReleaseVersions(listingHtml, baseUrl) {
    const versions = new Set(
        [...listingHtml.matchAll(/href="([^"]+)"/g)]
            .map((match) => extractLastPathSegment(String(match[1] || ''), baseUrl))
            .filter((value) => stableFirefoxAndroidVersionPattern.test(value)),
    );
    return [...versions].sort(compareFirefoxAndroidReleaseVersions);
}

/**
 * @param {string} listingHtml
 * @param {string} directoryUrl
 * @returns {string[]}
 */
export function extractFirefoxAndroidApkUrls(listingHtml, directoryUrl) {
    const apkUrls = new Set();
    for (const match of listingHtml.matchAll(/href="([^"]+\.apk(?:\?[^"]*)?)"/gi)) {
        try {
            apkUrls.add(new URL(String(match[1] || ''), directoryUrl).href);
        } catch {
            // Ignore malformed URLs in directory listings.
        }
    }
    return [...apkUrls];
}

/**
 * @param {string[]} apkUrls
 * @param {string} version
 * @returns {string|undefined}
 */
export function selectPreferredFirefoxAndroidApkUrl(apkUrls, version) {
    return (
        apkUrls.find((value) => value.endsWith(`/fenix-${version}.multi.android-x86_64.apk`)) ||
        apkUrls.find((value) => value.includes('.android-x86_64.apk')) ||
        apkUrls[0]
    );
}
