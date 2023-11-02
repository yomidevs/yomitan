/*
 * Copyright (C) 2023  Yomitan Authors
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

const {test: setup} = require('@playwright/test');
const {ManifestUtil} = require('../../dev/manifest-util');
const {root} = require('./playwright-util');
const path = require('path');
const fs = require('fs');

const manifestPath = path.join(root, 'ext/manifest.json');
const copyManifestPath = path.join(root, 'ext/manifest-old.json');

setup('use test manifest', () => {
    const manifestUtil = new ManifestUtil();
    const variant = manifestUtil.getManifest('chrome-playwright');
    fs.renameSync(manifestPath, copyManifestPath);
    fs.writeFileSync(manifestPath, ManifestUtil.createManifestString(variant).replace('$YOMITAN_VERSION', '0.0.0.0'));
});