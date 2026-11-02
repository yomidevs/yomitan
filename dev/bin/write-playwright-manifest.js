#!/usr/bin/env node
/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import fs from 'node:fs';
import {parseJson} from '../json.js';
import {ManifestUtil} from '../manifest-util.js';

const manifestUtil = new ManifestUtil();
const variant = manifestUtil.getManifest('chrome-playwright');
const text = ManifestUtil.createManifestString(variant).replaceAll('$YOMITAN_VERSION', '0.0.0.0');
fs.writeFileSync(new URL('../../ext/manifest.json', import.meta.url), text);
/** @type {Record<string, unknown>} */
const parsed = parseJson(text);
console.log('manifest written', {
    default_locale: parsed.default_locale,
    name: parsed.name,
    hasLocales: fs.existsSync(new URL('../../ext/_locales/ru/messages.json', import.meta.url)),
});
