/*
 * Copyright (C) 2020-2022  Yomichan Authors
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

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {testMain} = require('../dev/util');
const {ManifestUtil} = require('../dev/manifest-util');


function loadManifestString() {
    const manifestPath = path.join(__dirname, '..', 'ext', 'manifest.json');
    return fs.readFileSync(manifestPath, {encoding: 'utf8'});
}

function validateManifest() {
    const manifestUtil = new ManifestUtil();
    const manifest1 = loadManifestString();
    const manifest2 = ManifestUtil.createManifestString(manifestUtil.getManifest());
    assert.strictEqual(manifest1, manifest2, 'Manifest data does not match.');
}


function main() {
    validateManifest();
}


if (require.main === module) { testMain(main); }
