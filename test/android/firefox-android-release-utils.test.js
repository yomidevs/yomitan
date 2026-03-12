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

import {describe, expect, test} from 'vitest';
import {
    compareFirefoxAndroidReleaseVersions,
    extractFirefoxAndroidApkUrls,
    extractFirefoxAndroidStableReleaseVersions,
    selectPreferredFirefoxAndroidApkUrl,
} from './firefox-android-release-utils.js';

describe('Firefox Android release utils', () => {
    test('extracts and sorts stable versions from absolute and relative directory hrefs', () => {
        const baseUrl = 'https://ftp.mozilla.org/pub/fenix/releases/';
        const listingHtml = `
            <a href="/pub/fenix/">..</a>
            <a href="/pub/fenix/releases/100.2.0/">100.2.0/</a>
            <a href="100.10.0/">100.10.0/</a>
            <a href="/pub/fenix/releases/149.0b1/">149.0b1/</a>
            <a href="/pub/fenix/releases/100.3.0-beta.1/">100.3.0-beta.1/</a>
            <a href="/pub/fenix/releases/100.10.0/">100.10.0/</a>
        `;

        expect(extractFirefoxAndroidStableReleaseVersions(listingHtml, baseUrl)).toStrictEqual([
            '100.2.0',
            '100.10.0',
        ]);
    });

    test('compares dotted release versions numerically', () => {
        expect(compareFirefoxAndroidReleaseVersions('148.0', '148.0.2')).toBeLessThan(0);
        expect(compareFirefoxAndroidReleaseVersions('100.10.0', '100.2.0')).toBeGreaterThan(0);
        expect(compareFirefoxAndroidReleaseVersions('148.0.2', '148.0.2')).toBe(0);
    });

    test('resolves APK hrefs against the directory URL and prefers multi x86_64 builds', () => {
        const directoryUrl = 'https://ftp.mozilla.org/pub/fenix/releases/148.0.2/android/fenix-148.0.2-android-x86_64/';
        const listingHtml = `
            <a href="fenix-148.0.2.android-x86_64.apk">fallback x86_64</a>
            <a href="/pub/fenix/releases/148.0.2/android/fenix-148.0.2-android-x86_64/fenix-148.0.2.multi.android-x86_64.apk">preferred x86_64</a>
            <a href="/pub/fenix/releases/148.0.2/android/fenix-148.0.2-android-arm64-v8a/fenix-148.0.2.multi.android-arm64-v8a.apk">arm64</a>
        `;

        const apkUrls = extractFirefoxAndroidApkUrls(listingHtml, directoryUrl);

        expect(apkUrls).toContain('https://ftp.mozilla.org/pub/fenix/releases/148.0.2/android/fenix-148.0.2-android-x86_64/fenix-148.0.2.android-x86_64.apk');
        expect(apkUrls).toContain('https://ftp.mozilla.org/pub/fenix/releases/148.0.2/android/fenix-148.0.2-android-x86_64/fenix-148.0.2.multi.android-x86_64.apk');
        expect(selectPreferredFirefoxAndroidApkUrl(apkUrls, '148.0.2')).toBe('https://ftp.mozilla.org/pub/fenix/releases/148.0.2/android/fenix-148.0.2-android-x86_64/fenix-148.0.2.multi.android-x86_64.apk');
    });
});
