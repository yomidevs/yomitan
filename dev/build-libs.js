/*
 * Copyright (C) 2023  Yomitan Authors
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
const esbuild = require('esbuild');

async function buildLib(p) {
    await esbuild.build({
        entryPoints: [p],
        bundle: true,
        minify: false,
        sourcemap: true,
        target: 'es2020',
        format: 'esm',
        outfile: path.join(__dirname, '..', 'ext', 'lib', path.basename(p)),
        external: ['fs']
    });
}

async function buildLibs() {
    const devLibPath = path.join(__dirname, 'lib');
    const files = await fs.promises.readdir(devLibPath, {
        withFileTypes: true
    });
    for (const f of files) {
        if (f.isFile()) {
            await buildLib(path.join(devLibPath, f.name));
        }
    }
}

if (require.main === module) { buildLibs(); }

module.exports = {
    buildLibs
};
