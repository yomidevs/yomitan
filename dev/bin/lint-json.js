#!/usr/bin/env node
/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {ESLint} from 'eslint';

const eslint = new ESLint();
const results = await eslint.lintFiles(['**/*.json']);
const formatter = await eslint.loadFormatter('stylish');
const output = await formatter.format(results);

if (output.length > 0) {
    process.stdout.write(output);
}

const hasErrors = results.some(({errorCount, fatalErrorCount}) => errorCount > 0 || fatalErrorCount > 0);
process.exitCode = hasErrors ? 1 : 0;
